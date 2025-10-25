from sqlalchemy.orm import Session
from typing import Optional, List
from app import models


# ============ User CRUD ============
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, github_username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.github_username == github_username).first()


def create_user(db: Session, github_username: str, access_token: Optional[str] = None) -> models.User:
    db_user = models.User(github_username=github_username, access_token=access_token)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_token(db: Session, user_id: int, access_token: str) -> Optional[models.User]:
    db_user = get_user(db, user_id)
    if db_user:
        db_user.access_token = access_token
        db.commit()
        db.refresh(db_user)
    return db_user


# ============ Repository CRUD ============
def get_repository(db: Session, repo_id: int) -> Optional[models.Repository]:
    return db.query(models.Repository).filter(models.Repository.id == repo_id).first()


def get_repository_by_github_id(db: Session, github_id: int) -> Optional[models.Repository]:
    return db.query(models.Repository).filter(models.Repository.github_id == github_id).first()


def get_repositories_by_owner(db: Session, owner_id: int) -> List[models.Repository]:
    return db.query(models.Repository).filter(models.Repository.owner_id == owner_id).all()


def create_repository(db: Session, owner_id: int, github_id: int, name: str, url_path: str) -> models.Repository:
    db_repo = models.Repository(
        owner_id=owner_id,
        github_id=github_id,
        name=name,
        url_path=url_path
    )
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)
    return db_repo


# ============ Contributor CRUD ============
def get_contributor(db: Session, user_id: int, repo_id: int) -> Optional[models.Contributor]:
    return db.query(models.Contributor).filter(
        models.Contributor.user_id == user_id,
        models.Contributor.repo_id == repo_id
    ).first()


def get_contributors_by_repo(db: Session, repo_id: int) -> List[models.Contributor]:
    return db.query(models.Contributor).filter(models.Contributor.repo_id == repo_id).all()


def create_contributor(db: Session, user_id: int, repo_id: int, role: str, points: int = 0) -> models.Contributor:
    db_contributor = models.Contributor(
        user_id=user_id,
        repo_id=repo_id,
        role=role,
        points=points
    )
    db.add(db_contributor)
    db.commit()
    db.refresh(db_contributor)
    return db_contributor


def update_contributor_points(db: Session, contributor_id: int, points: int) -> Optional[models.Contributor]:
    db_contributor = db.query(models.Contributor).filter(models.Contributor.id == contributor_id).first()
    if db_contributor:
        db_contributor.points = points
        db.commit()
        db.refresh(db_contributor)
    return db_contributor


# ============ Pull Request CRUD ============
def get_pull_request(db: Session, pr_id: int) -> Optional[models.PullRequest]:
    return db.query(models.PullRequest).filter(models.PullRequest.id == pr_id).first()


def get_pull_requests_by_repo(db: Session, repo_id: int) -> List[models.PullRequest]:
    return db.query(models.PullRequest).filter(models.PullRequest.repo_id == repo_id).all()


def get_pull_requests_by_author(db: Session, author_id: int) -> List[models.PullRequest]:
    return db.query(models.PullRequest).filter(models.PullRequest.author_id == author_id).all()


def create_pull_request(db: Session, repo_id: int, number: int, author_id: int, score: int = 0) -> models.PullRequest:
    db_pr = models.PullRequest(
        repo_id=repo_id,
        number=number,
        author_id=author_id,
        score=score
    )
    db.add(db_pr)
    db.commit()
    db.refresh(db_pr)
    return db_pr


def update_pull_request_score(db: Session, pr_id: int, score: int) -> Optional[models.PullRequest]:
    db_pr = get_pull_request(db, pr_id)
    if db_pr:
        db_pr.score = score
        db.commit()
        db.refresh(db_pr)
    return db_pr


# ============ Issue CRUD ============
def get_issue(db: Session, issue_id: int) -> Optional[models.Issue]:
    return db.query(models.Issue).filter(models.Issue.id == issue_id).first()


def get_issues_by_pr(db: Session, pr_id: int) -> List[models.Issue]:
    return db.query(models.Issue).filter(models.Issue.pr_id == pr_id).all()


def get_unresolved_issues_by_pr(db: Session, pr_id: int) -> List[models.Issue]:
    return db.query(models.Issue).filter(
        models.Issue.pr_id == pr_id,
        models.Issue.resolved == False
    ).all()


def create_issue(
    db: Session,
    pr_id: int,
    type: str,
    message: str,
    file: str,
    line: int,
    points: int = 0
) -> models.Issue:
    db_issue = models.Issue(
        pr_id=pr_id,
        type=type,
        message=message,
        file=file,
        line=line,
        points=points,
        resolved=False
    )
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    return db_issue


def resolve_issue(db: Session, issue_id: int) -> Optional[models.Issue]:
    db_issue = get_issue(db, issue_id)
    if db_issue:
        db_issue.resolved = True
        db.commit()
        db.refresh(db_issue)
    return db_issue
