import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HospitalsPage: React.FC = () => {
  return (
    <AppShell pageMode="application">
      <PageContainer>
        <div className="mb-6 flex justify-between items-center">
          <Link to="/">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Overview
            </Button>
          </Link>
          <Badge variant="blue">Route: /hospitals</Badge>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-content-primary flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-medical-600" />
              <span>Healthcare Facility Recommendation</span>
            </h1>
            <p className="text-sm text-content-muted">
              Placeholder route for locating nearby hospitals, clinics, and emergency centers.
            </p>
          </div>

          <Card className="p-8 text-center bg-surface-subtle/50 border-dashed border-surface-border flex flex-col items-center justify-center">
            <Badge variant="blue" className="mb-3">Facility Locator Placeholder</Badge>
            <h2 className="text-base font-semibold text-content-primary mb-1">
              Hospital Finder Interface Placeholder
            </h2>
            <p className="text-xs text-content-muted max-w-sm">
              This placeholder verifies that the <code className="bg-surface-subtle px-1 py-0.5 rounded text-brand-700">/hospitals</code> route is active and ready for location service integration.
            </p>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
};
