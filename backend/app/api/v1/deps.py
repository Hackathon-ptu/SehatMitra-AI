from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = None
    if "@" in sub:
        user = db.query(User).filter(User.email == sub).first()
    else:
        try:
            user_id = int(sub)
            user = db.query(User).filter(User.id == user_id).first()
        except ValueError:
            user = db.query(User).filter(User.email == sub).first()
            
    if user is None:
        raise credentials_exception
    return user
