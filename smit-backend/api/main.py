from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.session import init_db
from api.routes.submit import router as submit_router
from api.routes.reports import router as reports_router
from api.routes.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SMIT AI Teaching Assistant",
    description="Multi-agent system for grading and feedback on programming assignments",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(submit_router)
app.include_router(reports_router)
app.include_router(admin_router)
