
from fastapi import FastAPI, Query

if __package__:
    from .app.discovery import router as discovery_router
    from .app.collection import router as collection_router
    from .app.comparison import router as comparison_router
    from .app.insights import router as insights_router
    from .app.frontend import router as frontend_router
    from .app.search import router as search_router
    from .app.chat import router as chat_router
    from .app.reports import router as reports_router
    from .app import storage
else:
    from app.discovery import router as discovery_router
    from app.collection import router as collection_router
    from app.comparison import router as comparison_router
    from app.insights import router as insights_router
    from app.frontend import router as frontend_router
    from app.search import router as search_router
    from app.chat import router as chat_router
    from app.reports import router as reports_router
    from app import storage

app = FastAPI(
    title="Competitor Analysis AI Agent",
    description="Salem IT Companies Analysis"
)
app.include_router(frontend_router)
app.include_router(search_router)
app.include_router(discovery_router)
app.include_router(collection_router)
app.include_router(comparison_router)
app.include_router(insights_router)
app.include_router(chat_router)
app.include_router(reports_router)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/companies")
def get_companies(
    industry: str = Query(default="all"),
    limit: int = Query(default=10, ge=1, le=15)
):
    records = storage.list_approved()
    if industry.casefold() != "all":
        records = [
            record for record in records
            if str(record.get("industry") or "").casefold() == industry.casefold()
        ]
    companies = [
        {
            **record.get("candidate", {}),
            "industry": record.get("industry"),
            "location": record.get("location"),
            "approval_status": "approved",
        }
        for record in records[:limit]
    ]
    return {
        "location": "Salem, Tamil Nadu",
        "count": len(companies),
        "source_type": "approved_storage",
        "companies": companies,
        "message": "Showing approved competitor records stored locally."
    }
