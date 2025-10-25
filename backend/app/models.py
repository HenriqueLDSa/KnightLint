from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String, unique=True, nullable=False, index=True)
    access_token = Column(String, nullable=True)  # Only if they need to push commits

    # Relationships
    owned_repos = relationship("Repository", back_populates="owner")
    contributions = relationship("Contributor", back_populates="user")
    pull_requests = relationship("PullRequest", back_populates="author")


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    github_id = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    url_path = Column(String, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_repos")
    contributors = relationship("Contributor", back_populates="repository")
    pull_requests = relationship("PullRequest", back_populates="repository")


class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    points = Column(Integer, default=0)
    role = Column(String, nullable=False)  # owner / contributor

    # Relationships
    user = relationship("User", back_populates="contributions")
    repository = relationship("Repository", back_populates="contributors")


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    number = Column(Integer, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, default=0)

    # Relationships
    repository = relationship("Repository", back_populates="pull_requests")
    author = relationship("User", back_populates="pull_requests")
    issues = relationship("Issue", back_populates="pull_request")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id"), nullable=False)
    type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    file = Column(String, nullable=False)
    line = Column(Integer, nullable=False)
    points = Column(Integer, default=0)
    resolved = Column(Boolean, default=False)

    # Relationships
    pull_request = relationship("PullRequest", back_populates="issues")
