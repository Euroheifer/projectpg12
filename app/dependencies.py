from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Annotated, List
from datetime import timedelta

from app import crud, auth, database, schemas, models
from app.models import User, Group, GroupMember


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(
    db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        user_email: str = payload.get("sub")

        if user_email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_email(db, email=user_email)

    if user is None:
        raise credentials_exception

    return user


def verify_group_owner(
    group_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.admin_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to manage this group"
        )
    return group


def get_group_with_access_check(
    group_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member = (
        db.query(GroupMember)
        .filter_by(group_id=group_id, user_id=current_user.id)
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=403, detail="You are not a member of this group"
        )

    return group

### add by sunzhe for US 5 20 Oct###################
def verify_group_admin(
    group: models.Group = Depends(get_group_with_access_check),
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    """Dependency that checks if the current user is an admin of the group."""
    member = crud.get_group_member(db, group_id=group.id, user_id=current_user.id)
    if not member or not member.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an admin to perform this action.",
        )
    return group
#######################################################

# ----------- invite -----------

def get_pending_invitation_as_invitee(
    invitation_id: int = Path(..., title="The ID of the invitation to respond to"),
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
) -> models.GroupInvitation:
    """
    Dependency that verifies if the current user is the invitee of a specific
    PENDING invitation.
    """
    db_invitation = crud.get_invitation_by_id(db, invitation_id=invitation_id)

    if not db_invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if db_invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to respond to this invitation",
        )

    if db_invitation.status != models.InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This invitation has already been {db_invitation.status.value}",
        )

    return db_invitation

