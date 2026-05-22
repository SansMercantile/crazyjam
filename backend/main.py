from fastapi import FastAPI
from contextlib import asynccontextmanager
from .CrazyJam_infrastructure_integration import CrazyJam_infra

@asynccontextmanager
async def lifespan(app: FastAPI):
    await CrazyJam_infra.initialize()
    yield
    await CrazyJam_infra.shutdown()

app = FastAPI(title="CrazyJam API", lifespan=lifespan)

@app.post("/fabrication/optimize-lattice")
async def optimize_lattice(specs: Dict[str, Any]):
    return {"result": CrazyJam_infra.optimize_molecular_lattice(specs)}
