import sys
import json
import asyncio
import os

# Adjust path to make sure root modules are findable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.genre_specialist_agent import GenreSpecialistAgent, MusicGenre
from core.composition_engine import CompositionEngine, CompositionRequest
from core.audio_processor import AudioProcessor, AudioConfig

async def main():
    try:
        # Read parameters from stdin or default
        if len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
        else:
            input_data = {}
            
        genre_str = input_data.get("genre", "electronic").lower()
        style_str = input_data.get("style", "techno").lower()
        mood_str = input_data.get("mood", "energetic").lower()
        tempo = int(input_data.get("tempo", 120))
        key = input_data.get("key", "C minor")
        prompt = input_data.get("prompt", "custom jam")
        complexity = float(input_data.get("complexity", 0.7))
        
        # Map string to MusicGenre Enum
        genre_enum = MusicGenre.ELECTRONIC
        for g in MusicGenre:
            if g.value.lower() in genre_str:
                genre_enum = g
                break
                
        # 1. Initialize Genre Specialist Agent
        agent = GenreSpecialistAgent(genre_enum)
        await agent.initialize()
        
        # Create initial composition request
        comp_req = {
            "genre": genre_str,
            "style": style_str,
            "mood": mood_str,
            "tempo": tempo,
            "key": key,
            "duration": 16, # 16 steps equivalent loop
            "instruments": ["synthesizer", "drums", "bass", "pad", "lead"],
            "complexity": complexity
        }
        
        # Suggest optimizations
        optimizations = await agent.suggest_optimizations(comp_req)
        
        # Merge optimizations
        optimized_tempo = int(optimizations.get("tempo", tempo))
        optimized_key = optimizations.get("key", key)
        optimized_instruments = optimizations.get("instruments", ["synthesizer", "drums", "bass", "pad", "lead"])
        
        # 2. Invoke Composition Engine
        engine = CompositionEngine()
        await engine.initialize()
        
        req = CompositionRequest(
            genre=genre_str,
            mood=mood_str,
            tempo=optimized_tempo,
            key=optimized_key,
            duration=4, # 4 bars / 16 steps
            instruments=optimized_instruments,
            style=style_str,
            complexity=complexity
        )
        
        result = await engine.compose(req)
        
        # Build structured debug chat logs to pipe to agent debates
        tech_log_debates = [
            {
                "agentName": f"{genre_str.capitalize()}Specialist_A1",
                "role": "Groove",
                "message": f"Core characteristics optimized! Adjusted tempo from {tempo} to {optimized_tempo} BPM. Suggested key: {optimized_key}.",
                "phase": "Sequence"
            },
            {
                "agentName": "Architect_H8",
                "role": "Harmonics",
                "message": f"Assembled bassline structure on root triads in {optimized_key} scale. Applied complexity model coef: {complexity}.",
                "phase": "Harmonics"
            },
            {
                "agentName": "Processor_A4",
                "role": "Mastering",
                "message": f"Generated {len(result.notes)} midi-events. Synchronized dynamic curves to match standard limiters.",
                "phase": "Mixdown"
            }
        ]
        
        success_response = {
            "status": "success",
            "tempo": optimized_tempo,
            "key": optimized_key,
            "instruments": optimized_instruments,
            "complexity": complexity,
            "genre": genre_str,
            "style": style_str,
            "mood": mood_str,
            "notes_count": len(result.notes),
            "quality_score": result.quality_score,
            "agentDebatesExtensions": tech_log_debates
        }
        
        print(json.dumps(success_response))
        
    except Exception as e:
        error_response = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_response))

if __name__ == "__main__":
    asyncio.run(main())
