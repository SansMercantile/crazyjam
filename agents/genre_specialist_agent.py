"""
CrazyJam Genre Specialist Agent - Specialized AI for genre-specific composition
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class MusicGenre(Enum):
    ELECTRONIC = "electronic"
    CLASSICAL = "classical"
    JAZZ = "jazz"
    ROCK = "rock"
    POP = "pop"
    HIP_HOP = "hip_hop"
    AMBIENT = "ambient"
    EXPERIMENTAL = "experimental"
    BLUES = "blues"
    COUNTRY = "country"
    FOLK = "folk"
    METAL = "metal"
    REGGAE = "reggae"
    WORLD = "world"

@dataclass
class GenreCharacteristics:
    """Characteristics of a music genre"""
    tempo_range: tuple[int, int]
    key_preferences: List[str]
    instrument_profiles: Dict[str, float]
    rhythm_patterns: List[str]
    harmony_complexity: float
    typical_structures: List[str]
    mood_associations: List[str]

class GenreSpecialistAgent:
    """Specialized AI agent for genre-specific music composition"""
    
    def __init__(self, genre: MusicGenre):
        self.genre = genre
        self.genre_characteristics = self._load_genre_characteristics()
        self.model_version = "1.3.0"
        self._initialized = False
        
    async def initialize(self):
        """Initialize the genre specialist agent"""
        if self._initialized:
            return
            
        logger.info(f"Initializing {self.genre.value} Genre Specialist Agent...")
        
        # Load genre-specific models and data
        await self._load_genre_models()
        
        self._initialized = True
        logger.info(f"{self.genre.value} Genre Specialist Agent initialized")
    
    async def _load_genre_models(self):
        """Load genre-specific neural models"""
        # Mock model loading
        pass
    
    def _load_genre_characteristics(self) -> GenreCharacteristics:
        """Load characteristics for the specific genre"""
        characteristics_map = {
            MusicGenre.ELECTRONIC: GenreCharacteristics(
                tempo_range=(120, 140),
                key_preferences=["C minor", "A minor", "G minor"],
                instrument_profiles={
                    "synthesizer": 0.9,
                    "drums": 0.8,
                    "bass": 0.7,
                    "pad": 0.6,
                    "lead": 0.5
                },
                rhythm_patterns=["4/4", "syncopated", "electronic"],
                harmony_complexity=0.6,
                typical_structures=["intro-buildup-drop-breakdown-outro"],
                mood_associations=["energetic", "dark", "futuristic"]
            ),
            MusicGenre.CLASSICAL: GenreCharacteristics(
                tempo_range=(60, 120),
                key_preferences=["C major", "G major", "D major"],
                instrument_profiles={
                    "piano": 0.9,
                    "strings": 0.8,
                    "woodwinds": 0.7,
                    "brass": 0.6,
                    "percussion": 0.4
                },
                rhythm_patterns=["classical", "orchestral", "structured"],
                harmony_complexity=0.9,
                typical_structures=["sonata", "symphony", "concerto"],
                mood_associations=["elegant", "dramatic", "emotional"]
            ),
            MusicGenre.JAZZ: GenreCharacteristics(
                tempo_range=(80, 160),
                key_preferences=["Bb major", "F major", "Eb major"],
                instrument_profiles={
                    "piano": 0.8,
                    "saxophone": 0.9,
                    "trumpet": 0.7,
                    "bass": 0.8,
                    "drums": 0.6
                },
                rhythm_patterns=["swing", "improvised", "complex"],
                harmony_complexity=0.8,
                typical_structures=["aaba", "12-bar blues", "modal"],
                mood_associations=["sophisticated", "relaxed", "improvisational"]
            ),
            MusicGenre.ROCK: GenreCharacteristics(
                tempo_range=(100, 140),
                key_preferences=["E major", "A major", "D major"],
                instrument_profiles={
                    "electric_guitar": 0.9,
                    "drums": 0.8,
                    "bass_guitar": 0.8,
                    "vocals": 0.7,
                    "keyboards": 0.5
                },
                rhythm_patterns=["4/4", "driving", "powerful"],
                harmony_complexity=0.5,
                typical_structures=["verse-chorus-bridge", "song-form"],
                mood_associations=["energetic", "rebellious", "powerful"]
            ),
            MusicGenre.POP: GenreCharacteristics(
                tempo_range=(90, 130),
                key_preferences=["C major", "G major", "A major"],
                instrument_profiles={
                    "vocals": 0.9,
                    "synthesizer": 0.7,
                    "drums": 0.8,
                    "bass": 0.6,
                    "guitar": 0.5
                },
                rhythm_patterns=["4/4", "catchy", "danceable"],
                harmony_complexity=0.4,
                typical_structures=["verse-chorus", "radio-friendly"],
                mood_associations=["upbeat", "catchy", "accessible"]
            )
        }
        
        return characteristics_map.get(self.genre, characteristics_map[MusicGenre.ELECTRONIC])
    
    async def analyze_compatibility(self, composition_request: Dict[str, Any]) -> float:
        """
        Analyze how well a composition request fits the genre
        """
        logger.info(f"Analyzing genre compatibility for {self.genre.value}")
        
        compatibility_score = 0.0
        
        # Check tempo compatibility
        tempo = composition_request.get('tempo', 120)
        tempo_score = self._calculate_tempo_compatibility(tempo)
        compatibility_score += tempo_score * 0.3
        
        # Check key compatibility
        key = composition_request.get('key', 'C major')
        key_score = self._calculate_key_compatibility(key)
        compatibility_score += key_score * 0.2
        
        # Check instrument compatibility
        instruments = composition_request.get('instruments', [])
        instrument_score = self._calculate_instrument_compatibility(instruments)
        compatibility_score += instrument_score * 0.3
        
        # Check mood compatibility
        mood = composition_request.get('mood', 'neutral')
        mood_score = self._calculate_mood_compatibility(mood)
        compatibility_score += mood_score * 0.2
        
        return min(1.0, compatibility_score)
    
    def _calculate_tempo_compatibility(self, tempo: int) -> float:
        """Calculate tempo compatibility with genre"""
        min_tempo, max_tempo = self.genre_characteristics.tempo_range
        
        if min_tempo <= tempo <= max_tempo:
            return 1.0
        elif tempo < min_tempo:
            return max(0.0, 1.0 - (min_tempo - tempo) / 50)
        else:
            return max(0.0, 1.0 - (tempo - max_tempo) / 50)
    
    def _calculate_key_compatibility(self, key: str) -> float:
        """Calculate key compatibility with genre"""
        if key in self.genre_characteristics.key_preferences:
            return 1.0
        else:
            # Check if key is related (relative major/minor)
            return 0.6
    
    def _calculate_instrument_compatibility(self, instruments: List[str]) -> float:
        """Calculate instrument compatibility with genre"""
        if not instruments:
            return 0.5
        
        total_score = 0.0
        for instrument in instruments:
            # Normalize instrument name
            normalized = instrument.lower().replace(" ", "_")
            score = self.genre_characteristics.instrument_profiles.get(normalized, 0.1)
            total_score += score
        
        return min(1.0, total_score / len(instruments))
    
    def _calculate_mood_compatibility(self, mood: str) -> float:
        """Calculate mood compatibility with genre"""
        if mood in self.genre_characteristics.mood_associations:
            return 1.0
        else:
            return 0.5
    
    async def suggest_optimizations(self, composition_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest optimizations to make composition more genre-appropriate
        """
        logger.info(f"Generating genre optimization suggestions for {self.genre.value}")
        
        suggestions = {}
        
        # Tempo suggestions
        current_tempo = composition_request.get('tempo', 120)
        optimal_tempo = self._suggest_optimal_tempo(current_tempo)
        if optimal_tempo != current_tempo:
            suggestions['tempo'] = optimal_tempo
        
        # Key suggestions
        current_key = composition_request.get('key', 'C major')
        optimal_key = self._suggest_optimal_key(current_key)
        if optimal_key != current_key:
            suggestions['key'] = optimal_key
        
        # Instrument suggestions
        current_instruments = composition_request.get('instruments', [])
        optimal_instruments = self._suggest_optimal_instruments(current_instruments)
        suggestions['instruments'] = optimal_instruments
        
        # Rhythm pattern suggestions
        suggestions['rhythm_pattern'] = self.genre_characteristics.rhythm_patterns[0]
        
        # Structure suggestions
        suggestions['structure'] = self.genre_characteristics.typical_structures[0]
        
        return suggestions
    
    def _suggest_optimal_tempo(self, current_tempo: int) -> int:
        """Suggest optimal tempo for the genre"""
        min_tempo, max_tempo = self.genre_characteristics.tempo_range
        
        if current_tempo < min_tempo:
            return min_tempo
        elif current_tempo > max_tempo:
            return max_tempo
        else:
            return current_tempo
    
    def _suggest_optimal_key(self, current_key: str) -> str:
        """Suggest optimal key for the genre"""
        if current_key in self.genre_characteristics.key_preferences:
            return current_key
        else:
            return self.genre_characteristics.key_preferences[0]
    
    def _suggest_optimal_instruments(self, current_instruments: List[str]) -> List[str]:
        """Suggest optimal instruments for the genre"""
        # Start with genre-preferred instruments
        genre_instruments = list(self.genre_characteristics.instrument_profiles.keys())
        
        # Keep instruments that are compatible
        compatible = [inst for inst in current_instruments 
                     if inst.lower().replace(" ", "_") in genre_instruments]
        
        # Add genre-specific instruments if needed
        if len(compatible) < 3:
            needed = 3 - len(compatible)
            top_genre_instruments = sorted(
                self.genre_characteristics.instrument_profiles.items(),
                key=lambda x: x[1],
                reverse=True
            )[:needed]
            
            for instrument, _ in top_genre_instruments:
                if instrument.replace("_", " ") not in compatible:
                    compatible.append(instrument.replace("_", " "))
        
        return compatible[:5]  # Limit to 5 instruments
    
    async def generate_genre_specific_patterns(self) -> Dict[str, Any]:
        """
        Generate genre-specific musical patterns and templates
        """
        logger.info(f"Generating {self.genre.value} specific patterns")
        
        patterns = {
            'chord_progressions': self._generate_chord_progressions(),
            'rhythm_patterns': self._generate_rhythm_patterns(),
            'melodic_contours': self._generate_melodic_contours(),
            'bass_lines': self._generate_bass_patterns(),
            'percussion_patterns': self._generate_percussion_patterns()
        }
        
        return patterns
    
    def _generate_chord_progressions(self) -> List[List[str]]:
        """Generate genre-appropriate chord progressions"""
        progressions_map = {
            MusicGenre.ELECTRONIC: [
                ["i", "VI", "III", "VII"],  # Minor progression
                ["I", "V", "vi", "IV"],    # Pop progression
                ["i", "iv", "VII", "III"]   # Dark electronic
            ],
            MusicGenre.CLASSICAL: [
                ["I", "IV", "V", "I"],      # Classical cadence
                ["I", "vi", "IV", "V"],     # Classical progression
                ["ii", "V", "I"]            # Classical turnaround
            ],
            MusicGenre.JAZZ: [
                ["ii7", "V7", "I7"],        # Jazz turnaround
                ["I7", "IV7", "ii7", "V7"], # Jazz blues
                ["iii7", "VI7", "ii7", "V7"] # Jazz progression
            ],
            MusicGenre.ROCK: [
                ["I", "IV", "V"],           # Rock progression
                ["i", "III", "VI", "VII"],  # Minor rock
                ["I", "bVII", "IV", "V"]    # Hard rock
            ],
            MusicGenre.POP: [
                ["I", "V", "vi", "IV"],     # Pop progression
                ["vi", "IV", "I", "V"],     # Pop progression variation
                ["I", "vi", "IV", "V"]      # Standard pop
            ]
        }
        
        return progressions_map.get(self.genre, progressions_map[MusicGenre.ELECTRONIC])
    
    def _generate_rhythm_patterns(self) -> List[str]:
        """Generate genre-appropriate rhythm patterns"""
        return self.genre_characteristics.rhythm_patterns
    
    def _generate_melodic_contours(self) -> List[str]:
        """Generate genre-appropriate melodic contours"""
        contours_map = {
            MusicGenre.ELECTRONIC: ["staccato", "arpeggiated", "synth-lead"],
            MusicGenre.CLASSICAL: ["legato", "expressive", "ornamented"],
            MusicGenre.JAZZ: ["improvised", "syncopated", "blue-notes"],
            MusicGenre.ROCK: ["driving", "power-chords", "riff-based"],
            MusicGenre.POP: ["catchy", "simple", "repetitive"]
        }
        
        return contours_map.get(self.genre, contours_map[MusicGenre.ELECTRONIC])
    
    def _generate_bass_patterns(self) -> List[str]:
        """Generate genre-appropriate bass patterns"""
        bass_map = {
            MusicGenre.ELECTRONIC: ["sub-bass", "sequenced", "octave-jumps"],
            MusicGenre.CLASSICAL: ["walking", "arpeggiated", "foundation"],
            MusicGenre.JAZZ: ["walking-bass", "syncopated", " improvisational"],
            MusicGenre.ROCK: ["root-fifth", "driving", "power-bass"],
            MusicGenre.POP: ["simple", "root-focused", "rhythmic"]
        }
        
        return bass_map.get(self.genre, bass_map[MusicGenre.ELECTRONIC])
    
    def _generate_percussion_patterns(self) -> List[str]:
        """Generate genre-appropriate percussion patterns"""
        percussion_map = {
            MusicGenre.ELECTRONIC: ["four-on-floor", "breakbeat", "techno"],
            MusicGenre.CLASSICAL: ["orchestral", "timpani", "accentuated"],
            MusicGenre.JAZZ: ["swing", "brushes", "syncopated"],
            MusicGenre.ROCK: ["backbeat", "power-drums", "fills"],
            MusicGenre.POP: ["steady", "danceable", "simple"]
        }
        
        return percussion_map.get(self.genre, percussion_map[MusicGenre.ELECTRONIC])
    
    async def get_genre_info(self) -> Dict[str, Any]:
        """Get comprehensive genre information"""
        return {
            'genre': self.genre.value,
            'characteristics': self.genre_characteristics,
            'model_version': self.model_version,
            'complexity_level': self.genre_characteristics.harmony_complexity,
            'typical_tempo_range': self.genre_characteristics.tempo_range,
            'preferred_keys': self.genre_characteristics.key_preferences,
            'signature_instruments': list(self.genre_characteristics.instrument_profiles.keys())[:3],
            'mood_profile': self.genre_characteristics.mood_associations
        }