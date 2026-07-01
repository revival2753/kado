from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers.auth import router as auth_router
from routers.words import router as words_router
from routers.study import router as study_router
from routers.streak import router as streak_router
from routers.stats import router as stats_router


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(words_router)
app.include_router(study_router)
app.include_router(streak_router)
app.include_router(stats_router)