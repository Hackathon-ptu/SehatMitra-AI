"""
Demo village for the ASHA portal.

Creates one ASHA worker (ASHA-101 / mobile 9876543210, M-PIN 1234) and a
realistic set of ~24 households whose dates are relative to *today*, so the
work list always shows due ANC visits, newborn visits, overdue vaccines, a
high-risk pregnancy, pending referrals and so on.

Runs once on startup when no ASHA worker exists. Re-seed with
``python -m scripts.seed_asha_demo --reset`` from the backend folder.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.asha import (
    AshaActivity, AshaAuditLog, AshaWorker, CareVisit, Immunization, Pregnancy, Referral,
)
from app.models.family import FamilyMember, Household
from app.services.asha import reference as ref
from app.services.asha.care_plan import today_ist
from app.services.asha.risk import assess_visit

DEMO_WORKER_CODE = "ASHA-101"
DEMO_PHONE = "9876543210"
DEMO_MPIN = "1234"


class _Seeder:
    def __init__(self, db: Session, worker: AshaWorker):
        self.db = db
        self.worker = worker
        self.today = today_ist()
        self.seq = 0

    # ── builders ────────────────────────────────────────────────────────────
    def ago(self, days: int) -> date:
        return self.today - timedelta(days=days)

    def household(self, head: str, hamlet: str, *, phone=None, category="OBC", bpl=False,
                  water="HANDPUMP", toilet=True, created_days_ago=120) -> Household:
        self.seq += 1
        hh = Household(
            household_code=f"HH-RAI-{self.seq:03d}",
            asha_id=self.worker.id,
            head_name=head,
            village="Raipur",
            hamlet=hamlet,
            phone=phone,
            social_category=category,
            is_bpl=bpl,
            drinking_water=water,
            has_toilet=toilet,
            consent_given=True,
            consent_at=datetime.now(timezone.utc) - timedelta(days=created_days_ago),
            created_at=datetime.now(timezone.utc) - timedelta(days=created_days_ago),
        )
        self.db.add(hh)
        self.db.flush()
        return hh

    def member(self, hh: Household, name: str, gender: str, *, years: int = 0, days: int = 0,
               relation: str = None, married: bool = None, conditions: List[str] = None,
               schemes: List[str] = None, mother: FamilyMember = None, birth_place: str = None,
               birth_weight: float = None, phone: str = None, vaccinated_upto: int = None) -> FamilyMember:
        m = FamilyMember(
            household_id=hh.id,
            name=name,
            gender=gender,
            dob=self.today - timedelta(days=years * 365 + days + (37 if years else 0)),
            dob_estimated=bool(years),
            relation=relation,
            marital_status=("MARRIED" if married else "UNMARRIED") if married is not None else None,
            chronic_conditions=conditions or [],
            enrolled_schemes=schemes or [],
            mother_id=mother.id if mother else None,
            birth_place=birth_place,
            birth_weight_kg=birth_weight,
            phone=phone,
        )
        self.db.add(m)
        self.db.flush()
        # Older children are assumed fully vaccinated unless a scenario says otherwise
        age = (self.today - m.dob).days
        if vaccinated_upto is not None:
            self.vaccinate_upto(m, vaccinated_upto)
        elif years and age < 17 * 365:
            self.vaccinate_upto(m, age)
        return m

    def pregnancy(self, m: FamilyMember, *, weeks: int, gravida=1, parity=0, registered_weeks_ago=None,
                  risk_factors=None, high_risk=False) -> Pregnancy:
        lmp = self.today - timedelta(weeks=weeks)
        reg = self.today - timedelta(weeks=registered_weeks_ago if registered_weeks_ago is not None else max(weeks - 8, 0))
        p = Pregnancy(member_id=m.id, registered_by=self.worker.id, lmp_date=lmp, edd=lmp + timedelta(days=280),
                      registered_on=reg, gravida=gravida, parity=parity, rch_id=f"1{m.id:011d}",
                      risk_factors=risk_factors or [], high_risk=high_risk or bool(risk_factors))
        self.db.add(p)
        self.db.flush()
        return p

    def delivered(self, mother: FamilyMember, *, days_ago: int, place="INSTITUTIONAL", facility="CHC Adampur",
                  gravida=1) -> Pregnancy:
        lmp = self.ago(days_ago + 273)
        p = Pregnancy(member_id=mother.id, registered_by=self.worker.id, lmp_date=lmp, edd=lmp + timedelta(days=280),
                      registered_on=lmp + timedelta(weeks=9), gravida=gravida, parity=gravida - 1, status="DELIVERED",
                      outcome="LIVE_BIRTH", outcome_date=self.ago(days_ago), delivery_place=place,
                      facility_name=facility if place == "INSTITUTIONAL" else None)
        self.db.add(p)
        self.db.flush()
        for n, start, _ in ref.ANC_SCHEDULE:
            self.visit(mother, "ANC", (self.today - (lmp + timedelta(weeks=start + 2))).days,
                       key=f"ANC_{n}", pregnancy=p, bp=(112, 74), hb=11.2, counselling=["IFA_CALCIUM", "NUTRITION"])
        return p

    def visit(self, m: FamilyMember, vtype: str, days_ago: int, *, key: str = None, pregnancy: Pregnancy = None,
              bp=None, weight=None, temp=None, hb=None, sugar=None, spo2=None, muac=None,
              danger: List[str] = None, findings: Dict = None, counselling: List[str] = None,
              notes: str = None, followup_in: int = None) -> CareVisit:
        on = self.ago(days_ago)
        vitals = {
            "bp_systolic": bp[0] if bp else None, "bp_diastolic": bp[1] if bp else None,
            "weight_kg": weight, "temperature_c": temp, "hb": hb, "blood_sugar": sugar,
            "spo2": spo2, "muac_cm": muac, "pulse": None,
        }
        level, reasons, extra = assess_visit(
            visit_type=vtype, age_days=(on - m.dob).days, gender=m.gender,
            is_pregnant=pregnancy is not None and pregnancy.status == "ACTIVE",
            vitals=vitals, danger_signs=danger or [], findings=findings or {},
        )
        f = dict(findings or {})
        if "cbac_score" in extra:
            f["cbac_score"] = extra["cbac_score"]
        v = CareVisit(
            household_id=m.household_id, member_id=m.id, pregnancy_id=pregnancy.id if pregnancy else None,
            asha_id=self.worker.id, visit_type=vtype, schedule_key=key, visit_date=on,
            danger_signs=danger or [], findings=f, counselling=counselling or [], notes=notes,
            risk_level=level, risk_reasons=reasons,
            next_followup_date=on + timedelta(days=followup_in) if followup_in is not None else None,
            **vitals,
        )
        self.db.add(v)
        self.db.flush()
        # Latest assessment is the member's current risk (visits are seeded oldest-first per member)
        m.risk_level, m.risk_reasons = level, reasons
        if pregnancy is not None and level == "HIGH":
            pregnancy.high_risk = True
            pregnancy.risk_factors = sorted(set((pregnancy.risk_factors or []) + [r["code"] for r in reasons]))
        return v

    def vaccinate_upto(self, child: FamilyMember, upto_days: int, *, skip=(), delay=3):
        """Give every UIP dose due at or before `upto_days` of age (on time + small delay)."""
        for v in ref.VACCINES:
            if v["due"] <= upto_days and v["code"] not in skip:
                given = child.dob + timedelta(days=v["due"] + (0 if v["due"] == 0 else delay))
                if given <= self.today:
                    self.db.add(Immunization(member_id=child.id, vaccine_code=v["code"], given_on=given,
                                             given_at="VHSND Raipur" if v["due"] else "CHC Adampur",
                                             recorded_by=self.worker.id))

    def hbnc_series(self, baby: FamilyMember, mother: FamilyMember, upto_day: int):
        days = ref.HBNC_DAYS_HOME if baby.birth_place == "HOME" else ref.HBNC_DAYS_INSTITUTIONAL
        age = (self.today - baby.dob).days
        for d in days:
            if d <= upto_day and d <= age:
                self.visit(baby, "HBNC", age - d, key=f"HBNC_D{d}", temp=36.8,
                           weight=round((baby.birth_weight_kg or 2.8) + d * 0.02, 2),
                           counselling=["EXCLUSIVE_BREASTFEEDING", "KANGAROO_CARE"],
                           findings={"breastfeeding": "EXCLUSIVE", "mother_ok": True})

    def referral(self, m: FamilyMember, *, days_ago: int, reason: str, urgency="ROUTINE", facility_type="PHC",
                 facility="PHC Adampur", status="PENDING", visit: CareVisit = None, token: str = None,
                 visited_days_ago: int = None, notes: str = None) -> Referral:
        r = Referral(household_id=m.household_id, member_id=m.id, visit_id=visit.id if visit else None,
                     asha_id=self.worker.id, reason=reason, urgency=urgency, facility_type=facility_type,
                     facility_name=facility, referred_on=self.ago(days_ago), status=status,
                     visited_on=self.ago(visited_days_ago) if visited_days_ago is not None else None,
                     outcome_notes=notes, opd_token=token)
        self.db.add(r)
        self.db.flush()
        return r

    def ncd(self, m: FamilyMember, days_ago: int, *, bp=(124, 80), sugar=110, tobacco="NEVER", waist=84,
            inactive=False, family_history=False, followup_in=None, danger=None):
        return self.visit(m, "NCD", days_ago, bp=bp, sugar=sugar, danger=danger, followup_in=followup_in,
                          counselling=["NCD_LIFESTYLE"],
                          findings={"cbac": {"tobacco": tobacco, "alcohol_daily": False, "waist_cm": waist,
                                             "inactive": inactive, "family_history": family_history}})

    # ── the village ─────────────────────────────────────────────────────────
    def run(self):
        s = self

        # 1. High-risk pregnancy: raised BP at last ANC, ANC-3 due
        hh = s.household("Ramesh Sharma", "Ward 1", phone="9812345601", category="GEN")
        ramesh = s.member(hh, "Ramesh Sharma", "M", years=32, relation="HEAD", married=True)
        kamla = s.member(hh, "Kamla Devi", "F", years=28, relation="SPOUSE", married=True, phone="9812345602")
        s.member(hh, "Savitri Sharma", "F", years=61, relation="MOTHER", married=True, conditions=["HYPERTENSION"])
        s.member(hh, "Aman Sharma", "M", years=4, relation="SON", mother=kamla)
        p = s.pregnancy(kamla, weeks=29, gravida=2, parity=1, registered_weeks_ago=21)
        s.visit(kamla, "ANC", 7 * 20, key="ANC_1", pregnancy=p, bp=(116, 76), hb=10.8, weight=52,
                counselling=["IFA_CALCIUM", "NUTRITION"])
        s.visit(kamla, "ANC", 7 * 9, key="ANC_2", pregnancy=p, bp=(128, 84), hb=10.2, weight=56)
        s.visit(kamla, "ANC", 6, pregnancy=p, bp=(148, 96), hb=9.6, weight=59, danger=["SWELLING_FACE_HANDS"],
                counselling=["DANGER_SIGNS", "BIRTH_PREPAREDNESS"], followup_in=2,
                notes="Swelling of feet and hands since 1 week. Advised PHC check-up.")
        s.db.add(Immunization(member_id=kamla.id, vaccine_code="TD1_PW", given_on=s.ago(7 * 19), recorded_by=s.worker.id))
        s.db.add(Immunization(member_id=kamla.id, vaccine_code="TD2_PW", given_on=s.ago(7 * 15), recorded_by=s.worker.id))
        s.referral(kamla, days_ago=6, reason="Raised BP (148/96) with swelling at 28 weeks — suspected pre-eclampsia",
                   urgency="URGENT", facility_type="CHC", facility="CHC Adampur")

        # 2. Early pregnancy, Td-2 due
        hh = s.household("Rajesh Kumar", "Ward 2", phone="9812345611", bpl=True)
        s.member(hh, "Rajesh Kumar", "M", years=25, relation="HEAD", married=True)
        pooja = s.member(hh, "Pooja Kumari", "F", years=22, relation="SPOUSE", married=True, schemes=["PMJAY"])
        p = s.pregnancy(pooja, weeks=15, registered_weeks_ago=6)
        s.visit(pooja, "ANC", 38, key="ANC_1", pregnancy=p, bp=(112, 72), hb=11.4, weight=48,
                counselling=["IFA_CALCIUM", "NUTRITION", "INSTITUTIONAL_DELIVERY"])
        s.db.add(Immunization(member_id=pooja.id, vaccine_code="TD1_PW", given_on=s.ago(33), recorded_by=s.worker.id))

        # 3. Newborn, 6 days old — HBNC day-7 visit coming up
        hh = s.household("Suresh Yadav", "Ward 3", phone="9812345621")
        s.member(hh, "Suresh Yadav", "M", years=29, relation="HEAD", married=True)
        rekha = s.member(hh, "Rekha Yadav", "F", years=25, relation="SPOUSE", married=True)
        s.member(hh, "Kaushalya Devi", "F", years=55, relation="MOTHER", married=True)
        s.delivered(rekha, days_ago=6, gravida=1)
        baby = s.member(hh, "Baby of Rekha", "F", days=6, relation="DAUGHTER", mother=rekha,
                        birth_place="INSTITUTIONAL", birth_weight=2.7)
        s.vaccinate_upto(baby, 0)
        s.hbnc_series(baby, rekha, upto_day=3)

        # 4. Infant with overdue MR-1 and HBYC-9 month visit
        hh = s.household("Vijay Pal", "Ward 1", phone="9812345631", category="SC", bpl=True)
        s.member(hh, "Vijay Pal", "M", years=30, relation="HEAD", married=True, schemes=["PMJAY"])
        sunita = s.member(hh, "Sunita Pal", "F", years=26, relation="SPOUSE", married=True)
        s.delivered(sunita, days_ago=302, gravida=2)
        aarav = s.member(hh, "Aarav Pal", "M", days=302, relation="SON", mother=sunita,
                         birth_place="INSTITUTIONAL", birth_weight=2.9)
        s.member(hh, "Khushi Pal", "F", years=5, relation="DAUGHTER", mother=sunita)
        s.vaccinate_upto(aarav, 98)
        s.hbnc_series(aarav, sunita, upto_day=42)
        s.visit(aarav, "HBYC", 302 - 92, key="HBYC_M3", weight=5.9, counselling=["EXCLUSIVE_BREASTFEEDING"])
        s.visit(aarav, "HBYC", 302 - 184, key="HBYC_M6", weight=7.4, counselling=["COMPLEMENTARY_FEEDING"])

        # 5. Elderly man with hypertension + diabetes, follow-up overdue
        hh = s.household("Ram Lal", "Ward 2", phone="9812345641")
        ramlal = s.member(hh, "Ram Lal", "M", years=62, relation="HEAD", married=True,
                          conditions=["HYPERTENSION", "DIABETES"])
        shanti = s.member(hh, "Shanti Devi", "F", years=58, relation="SPOUSE", married=True)
        s.ncd(ramlal, 20, bp=(142, 92), sugar=210, tobacco="DAILY", waist=98, inactive=True,
              family_history=True, followup_in=14)
        s.ncd(shanti, 200, bp=(130, 84), sugar=118, waist=86)

        # 6. 7-week-old: 6-week vaccines due now
        hh = s.household("Manoj Verma", "Ward 3", phone="9812345651")
        s.member(hh, "Manoj Verma", "M", years=27, relation="HEAD", married=True)
        neha = s.member(hh, "Neha Verma", "F", years=24, relation="SPOUSE", married=True)
        s.delivered(neha, days_ago=49, gravida=1)
        vihaan = s.member(hh, "Vihaan Verma", "M", days=49, relation="SON", mother=neha,
                          birth_place="INSTITUTIONAL", birth_weight=3.1)
        s.vaccinate_upto(vihaan, 0)
        s.hbnc_series(vihaan, neha, upto_day=42)

        # 7. Late pregnancy (37 weeks): birth preparedness + ANC-4
        hh = s.household("Deepak Chauhan", "Ward 4", phone="9812345661")
        s.member(hh, "Deepak Chauhan", "M", years=30, relation="HEAD", married=True)
        meena = s.member(hh, "Meena Chauhan", "F", years=26, relation="SPOUSE", married=True)
        s.member(hh, "Riya Chauhan", "F", years=3, relation="DAUGHTER", mother=meena)
        p = s.pregnancy(meena, weeks=37, gravida=2, parity=1, registered_weeks_ago=29)
        for n, wk in ((1, 9), (2, 20), (3, 31)):
            s.visit(meena, "ANC", (37 - wk) * 7, key=f"ANC_{n}", pregnancy=p, bp=(118, 76), hb=11.0)
        s.db.add(Immunization(member_id=meena.id, vaccine_code="TDB_PW", given_on=s.ago(7 * 27), recorded_by=s.worker.id))

        # 8. EDD passed — delivery outcome to be recorded
        hh = s.household("Sanjay Gupta", "Ward 1", phone="9812345671", category="GEN")
        s.member(hh, "Sanjay Gupta", "M", years=28, relation="HEAD", married=True)
        anjali = s.member(hh, "Anjali Gupta", "F", years=24, relation="SPOUSE", married=True)
        p = s.pregnancy(anjali, weeks=41, registered_weeks_ago=32)
        for n, wk in ((1, 10), (2, 22), (3, 30), (4, 37)):
            s.visit(anjali, "ANC", (41 - wk) * 7, key=f"ANC_{n}", pregnancy=p, bp=(114, 74), hb=11.6)
        s.visit(anjali, "ANC", 30, key="BIRTH_PREP", pregnancy=p, counselling=["BIRTH_PREPAREDNESS", "INSTITUTIONAL_DELIVERY"])
        s.db.add(Immunization(member_id=anjali.id, vaccine_code="TD1_PW", given_on=s.ago(7 * 30), recorded_by=s.worker.id))
        s.db.add(Immunization(member_id=anjali.id, vaccine_code="TD2_PW", given_on=s.ago(7 * 26), recorded_by=s.worker.id))

        # 9. TB patient, routine referral not yet confirmed
        hh = s.household("Mohan Singh", "Ward 4", phone="9812345681", category="SC", bpl=True)
        mohan = s.member(hh, "Mohan Singh", "M", years=45, relation="HEAD", married=True)
        s.member(hh, "Parvati Devi", "F", years=41, relation="SPOUSE", married=True)
        s.member(hh, "Rohit Singh", "M", years=16, relation="SON")
        v = s.visit(mohan, "GENERAL", 5, danger=["COUGH_2_WEEKS", "WEIGHT_LOSS", "NIGHT_SWEATS"],
                    counselling=["DANGER_SIGNS"], notes="Cough for 3 weeks. Sputum test advised.")
        s.referral(mohan, days_ago=5, reason="Presumptive TB — cough 3 weeks, weight loss, night sweats. Sputum test.",
                   facility_type="PHC", visit=v)

        # 10. Toddler with 16-month doses overdue
        hh = s.household("Harpreet Singh", "Ward 2", phone="9812345691")
        s.member(hh, "Harpreet Singh", "M", years=31, relation="HEAD", married=True)
        jaspreet = s.member(hh, "Jaspreet Kaur", "F", years=28, relation="SPOUSE", married=True)
        ishaan = s.member(hh, "Ishaan Singh", "M", days=540, relation="SON", mother=jaspreet, birth_place="INSTITUTIONAL")
        s.vaccinate_upto(ishaan, 270)
        for mo in ref.HBYC_MONTHS:
            s.visit(ishaan, "HBYC", 540 - int(mo * 30.4) - 2, key=f"HBYC_M{mo}", weight=6 + mo * 0.3,
                    counselling=["COMPLEMENTARY_FEEDING"])

        # 11. Joint family with a 74-year-old and a 10-year-old due for Td
        hh = s.household("Gurdev Kaur", "Ward 3", phone="9812345701")
        s.member(hh, "Gurdev Kaur", "F", years=74, relation="HEAD", married=False, conditions=["HYPERTENSION"])
        s.member(hh, "Balwinder Singh", "M", years=46, relation="SON", married=True)
        manjit = s.member(hh, "Manjit Kaur", "F", years=40, relation="DAUGHTER_IN_LAW", married=True)
        s.member(hh, "Simran Kaur", "F", years=12, relation="GRANDDAUGHTER", mother=manjit)
        s.member(hh, "Tanvir Singh", "M", years=10, relation="GRANDSON", mother=manjit, vaccinated_upto=1825)

        # 12. Home delivery 2 days ago, teenage mother
        hh = s.household("Ramu Prasad", "Ward 4", phone="9812345711", category="ST", bpl=True, toilet=False, water="WELL")
        s.member(hh, "Ramu Prasad", "M", years=23, relation="HEAD", married=True)
        babli = s.member(hh, "Babli Devi", "F", years=19, relation="SPOUSE", married=True)
        s.delivered(babli, days_ago=2, place="HOME", gravida=1)
        s.member(hh, "Baby of Babli", "M", days=2, relation="SON", mother=babli, birth_place="HOME", birth_weight=2.3)

        # 13. Emergency: severe pre-eclampsia signs yesterday
        hh = s.household("Naresh Thakur", "Ward 1", phone="9812345721")
        s.member(hh, "Naresh Thakur", "M", years=34, relation="HEAD", married=True)
        lalita = s.member(hh, "Lalita Thakur", "F", years=31, relation="SPOUSE", married=True)
        p = s.pregnancy(lalita, weeks=33, gravida=3, parity=2, registered_weeks_ago=25)
        s.db.add(Immunization(member_id=lalita.id, vaccine_code="TD1_PW", given_on=s.ago(7 * 22), recorded_by=s.worker.id))
        s.db.add(Immunization(member_id=lalita.id, vaccine_code="TD2_PW", given_on=s.ago(7 * 18), recorded_by=s.worker.id))
        s.visit(lalita, "ANC", 7 * 22, key="ANC_1", pregnancy=p, bp=(120, 80), hb=10.9)
        s.visit(lalita, "ANC", 7 * 10, key="ANC_2", pregnancy=p, bp=(126, 82), hb=10.4)
        v = s.visit(lalita, "ANC", 1, pregnancy=p, bp=(164, 112),
                    danger=["SEVERE_HEADACHE_BLURRED_VISION", "SWELLING_FACE_HANDS"],
                    notes="Severe headache and blurred vision since morning. 108 called.")
        s.referral(lalita, days_ago=1, reason="Severe headache, blurred vision, BP 164/112 at 33 weeks",
                   urgency="EMERGENCY", facility_type="DH", facility="District Hospital Jalandhar",
                   visit=v, token="ASHA-DEMO01")

        # 14. Child referred for diarrhoea — reached PHC
        hh = s.household("Anil Kumar", "Ward 2", phone="9812345731", bpl=True)
        s.member(hh, "Anil Kumar", "M", years=33, relation="HEAD", married=True)
        geeta = s.member(hh, "Geeta Devi", "F", years=29, relation="SPOUSE", married=True)
        golu = s.member(hh, "Golu Kumar", "M", years=2, relation="SON", mother=geeta)
        v = s.visit(golu, "GENERAL", 10, temp=38.2, danger=["DIARRHOEA_DEHYDRATION"],
                    counselling=["ORS_ZINC", "HANDWASHING"])
        s.referral(golu, days_ago=10, reason="Diarrhoea with dehydration", urgency="URGENT", status="VISITED",
                   visit=v, visited_days_ago=9, notes="IV fluids at PHC, discharged next day.")
        s.visit(golu, "FOLLOW_UP", 7, temp=37.0, counselling=["ORS_ZINC"], notes="Recovered, eating well.")

        # 15–24. Other families in the area
        hh = s.household("Kishan Lal", "Ward 3", phone="9812345741")
        kishan = s.member(hh, "Kishan Lal", "M", years=52, relation="HEAD", married=True)
        kamlesh = s.member(hh, "Kamlesh Devi", "F", years=48, relation="SPOUSE", married=True)
        s.member(hh, "Sonu", "M", years=19, relation="SON")
        s.ncd(kishan, 40, bp=(136, 86), sugar=142, tobacco="PAST", waist=94, family_history=True)

        hh = s.household("Bhola Nath", "Ward 4", phone="9812345751", category="SC", bpl=True)
        s.member(hh, "Bhola Nath", "M", years=67, relation="HEAD", married=True, conditions=["ASTHMA_COPD"])
        s.member(hh, "Ramkali", "F", years=63, relation="SPOUSE", married=True)

        hh = s.household("Amit Rana", "Ward 1", phone="9812345761", category="GEN")
        s.member(hh, "Amit Rana", "M", years=27, relation="HEAD", married=True)
        priya = s.member(hh, "Priya Rana", "F", years=24, relation="SPOUSE", married=True)
        kid = s.member(hh, "Kavya Rana", "F", days=420, relation="DAUGHTER", mother=priya, birth_place="INSTITUTIONAL")
        s.vaccinate_upto(kid, 270)
        for mo in (3, 6, 9, 12):
            s.visit(kid, "HBYC", 420 - int(mo * 30.4) - 1, key=f"HBYC_M{mo}", weight=5 + mo * 0.35)

        hh = s.household("Dinesh Saini", "Ward 2", phone="9812345771")
        s.member(hh, "Dinesh Saini", "M", years=38, relation="HEAD", married=True)
        rani = s.member(hh, "Rani Saini", "F", years=35, relation="SPOUSE", married=True)
        s.member(hh, "Nikhil Saini", "M", years=13, relation="SON", mother=rani)
        s.member(hh, "Nisha Saini", "F", years=8, relation="DAUGHTER", mother=rani)
        s.ncd(rani, 90, bp=(118, 78), sugar=96, waist=78)

        hh = s.household("Satpal", "Ward 3", phone="9812345781", category="SC")
        satpal = s.member(hh, "Satpal", "M", years=41, relation="HEAD", married=True)
        s.member(hh, "Rajni", "F", years=36, relation="SPOUSE", married=True)
        s.ncd(satpal, 380, bp=(132, 88), tobacco="DAILY", waist=92)

        hh = s.household("Om Prakash", "Ward 4", phone="9812345791")
        op = s.member(hh, "Om Prakash", "M", years=71, relation="HEAD", married=True,
                      conditions=["HYPERTENSION", "HEART_DISEASE"], schemes=["PMJAY_70"])
        s.member(hh, "Vidya Devi", "F", years=68, relation="SPOUSE", married=True, conditions=["DIABETES"])
        s.ncd(op, 60, bp=(138, 86), sugar=128, waist=96, family_history=True)

        hh = s.household("Rakesh Bhatt", "Ward 1", phone="9812345801", category="GEN")
        s.member(hh, "Rakesh Bhatt", "M", years=35, relation="HEAD", married=True)
        s.member(hh, "Sarita Bhatt", "F", years=31, relation="SPOUSE", married=True)
        s.member(hh, "Arjun Bhatt", "M", years=6, relation="SON")

        hh = s.household("Lakhan Kewat", "Ward 2", phone="9812345811", category="OBC", bpl=True)
        s.member(hh, "Lakhan Kewat", "M", years=24, relation="HEAD", married=True)
        s.member(hh, "Radha Kewat", "F", years=21, relation="SPOUSE", married=True)

        hh = s.household("Jagdish Meena", "Ward 3", phone="9812345821", category="ST")
        jagdish = s.member(hh, "Jagdish Meena", "M", years=49, relation="HEAD", married=True, conditions=["TB"])
        s.member(hh, "Kali Bai", "F", years=45, relation="SPOUSE", married=True)
        s.visit(jagdish, "GENERAL", 12, counselling=["TB_ADHERENCE", "NUTRITION"], notes="On TB treatment, month 4. Taking doses regularly.")

        hh = s.household("Farida Begum", "Ward 4", phone="9812345831")
        s.member(hh, "Farida Begum", "F", years=44, relation="HEAD", married=False)
        s.member(hh, "Salman", "M", years=20, relation="SON")
        s.member(hh, "Rukhsar", "F", years=17, relation="DAUGHTER")

        # Community activities
        for days_ago, kind, topic, n in (
            (12, "VHSND", "Immunization & ANC check-ups", 34),
            (5, "MOTHERS_MEETING", "Exclusive breastfeeding", 11),
            (40, "VHSNC", "Village sanitation plan", 9),
            (43, "VHSND", "Immunization & nutrition", 29),
        ):
            s.db.add(AshaActivity(asha_id=s.worker.id, activity_type=kind, activity_date=s.ago(days_ago),
                                  topic=topic, participants=n))


def seed_asha_demo(db: Session, reset: bool = False) -> Optional[str]:
    """Seed the demo ASHA and village. Returns a status message, or None if skipped."""
    existing = db.query(AshaWorker).filter(AshaWorker.worker_code == DEMO_WORKER_CODE).first()
    if existing and not reset:
        return None
    if existing and reset:
        hh_ids = [h.id for h in db.query(Household.id).filter(Household.asha_id == existing.id)]
        if hh_ids:
            member_ids = [m.id for m in db.query(FamilyMember.id).filter(FamilyMember.household_id.in_(hh_ids))]
            for model, col in ((Referral, Referral.household_id), (CareVisit, CareVisit.household_id)):
                db.query(model).filter(col.in_(hh_ids)).delete(synchronize_session=False)
            if member_ids:
                db.query(Immunization).filter(Immunization.member_id.in_(member_ids)).delete(synchronize_session=False)
                db.query(Pregnancy).filter(Pregnancy.member_id.in_(member_ids)).delete(synchronize_session=False)
                db.query(FamilyMember).filter(FamilyMember.id.in_(member_ids)).update(
                    {FamilyMember.mother_id: None}, synchronize_session=False)
                db.query(FamilyMember).filter(FamilyMember.id.in_(member_ids)).delete(synchronize_session=False)
            db.query(Household).filter(Household.id.in_(hh_ids)).delete(synchronize_session=False)
        db.query(AshaActivity).filter(AshaActivity.asha_id == existing.id).delete(synchronize_session=False)
        db.query(AshaAuditLog).filter(AshaAuditLog.asha_id == existing.id).delete(synchronize_session=False)
        db.delete(existing)
        db.flush()

    worker = AshaWorker(
        worker_code=DEMO_WORKER_CODE,
        phone=DEMO_PHONE,
        mpin_hash=get_password_hash(DEMO_MPIN),
        full_name="Sunita Devi",
        village="Raipur",
        sub_center="Raipur Sub-Centre (AAM)",
        phc="PHC Adampur",
        block="Adampur",
        district="Jalandhar",
        state="Punjab",
        population_covered=1040,
        supervisor_name="Kiran Bala (ANM)",
        supervisor_phone="9814000011",
        preferred_language="hi",
    )
    db.add(worker)
    db.flush()
    _Seeder(db, worker).run()
    db.commit()
    return f"Seeded demo ASHA {DEMO_WORKER_CODE} with village Raipur"
