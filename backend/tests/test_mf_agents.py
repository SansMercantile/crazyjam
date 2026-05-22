"""
CrazyJam Agents Tests - Comprehensive testing for music AI agents
"""

import pytest
import asyncio
import logging
from unittest.mock import Mock, patch

# Import CrazyJam system components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from constellation.CrazyJamazyJam.backend.agents.genre_specialist_agent import (
    GenreSpecialistAgent,
    MusicGenre,
    GenreCharacteristics
)

logger = logging.getLogger(__name__)

class TestGenreSpecialistAgent:
    """Test suite for Genre Specialist Agent"""
    
    @pytest.fixture
    async def electronic_agent(self):
        """Create electronic music genre specialist agent"""
        agent = GenreSpecialistAgent(MusicGenre.ELECTRONIC)
        await agent.initialize()
        return agent
    
    @pytest.fixture
    async def classical_agent(self):
        """Create classical music genre specialist agent"""
        agent = GenreSpecialistAgent(MusicGenre.CLASSICAL)
        await agent.initialize()
        return agent
    
    @pytest.fixture
    async def jazz_agent(self):
        """Create jazz music genre specialist agent"""
        agent = GenreSpecialistAgent(MusicGenre.JAZZ)
        await agent.initialize()
        return agent
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test genre specialist agent initialization"""
        agent = GenreSpecialistAgent(MusicGenre.ELECTRONIC)
        
        assert not agent._initialized
        assert agent.genre == MusicGenre.ELECTRONIC
        assert agent.model_version == "1.3.0"
        
        await agent.initialize()
        
        assert agent._initialized
        assert hasattr(agent, 'genre_characteristics')
    
    @pytest.mark.asyncio
    async def test_genre_characteristics_loading(self):
        """Test loading of genre characteristics"""
        genres = [MusicGenre.ELECTRONIC, MusicGenre.CLASSICAL, MusicGenre.JAZZ, 
                  MusicGenre.ROCK, MusicGenre.POP]
        
        for genre in genres:
            agent = GenreSpecialistAgent(genre)
            await agent.initialize()
            
            characteristics = agent.genre_characteristics
            assert isinstance(characteristics, GenreCharacteristics)
            assert characteristics.tempo_range[0] < characteristics.tempo_range[1]
            assert len(characteristics.key_preferences) > 0
            assert len(characteristics.instrument_profiles) > 0
            assert len(characteristics.rhythm_patterns) > 0
            assert 0.0 <= characteristics.harmony_complexity <= 1.0
            assert len(characteristics.typical_structures) > 0
            assert len(characteristics.mood_associations) > 0
    
    @pytest.mark.asyncio
    async def test_electronic_genre_characteristics(self, electronic_agent):
        """Test electronic music genre characteristics"""
        characteristics = electronic_agent.genre_characteristics
        
        # Electronic music typically has faster tempos
        assert characteristics.tempo_range[0] >= 120
        assert characteristics.tempo_range[1] <= 140
        
        # Should prefer minor keys
        assert "C minor" in characteristics.key_preferences
        assert "A minor" in characteristics.key_preferences
        
        # Should emphasize electronic instruments
        assert "synthesizer" in characteristics.instrument_profiles
        assert characteristics.instrument_profiles["synthesizer"] > 0.8
        
        # Should have electronic rhythm patterns
        assert "electronic" in characteristics.rhythm_patterns
        
        # Should have energetic moods
        assert "energetic" in characteristics.mood_associations
    
    @pytest.mark.asyncio
    async def test_classical_genre_characteristics(self, classical_agent):
        """Test classical music genre characteristics"""
        characteristics = classical_agent.genre_characteristics
        
        # Classical music has wider tempo range
        assert characteristics.tempo_range[0] >= 60
        assert characteristics.tempo_range[1] <= 120
        
        # Should prefer major keys
        assert "C major" in characteristics.key_preferences
        assert "G major" in characteristics.key_preferences
        
        # Should emphasize classical instruments
        assert "piano" in characteristics.instrument_profiles
        assert "strings" in characteristics.instrument_profiles
        
        # Should have high harmony complexity
        assert characteristics.harmony_complexity > 0.8
        
        # Should have classical structures
        assert "sonata" in characteristics.typical_structures
    
    @pytest.mark.asyncio
    async def test_jazz_genre_characteristics(self, jazz_agent):
        """Test jazz music genre characteristics"""
        characteristics = jazz_agent.genre_characteristics
        
        # Jazz has medium to fast tempos
        assert characteristics.tempo_range[0] >= 80
        assert characteristics.tempo_range[1] <= 160
        
        # Should prefer jazz keys
        assert "Bb major" in characteristics.key_preferences
        assert "F major" in characteristics.key_preferences
        
        # Should emphasize jazz instruments
        assert "saxophone" in characteristics.instrument_profiles
        assert "trumpet" in characteristics.instrument_profiles
        
        # Should have jazz rhythm patterns
        assert "swing" in characteristics.rhythm_patterns
        assert "improvised" in characteristics.rhythm_patterns
        
        # Should have jazz structures
        assert "12-bar blues" in characteristics.typical_structures
    
    @pytest.mark.asyncio
    async def test_compatibility_analysis(self, electronic_agent):
        """Test genre compatibility analysis"""
        # Test highly compatible request
        compatible_request = {
            'genre': 'electronic',
            'tempo': 128,
            'key': 'C minor',
            'instruments': ['synthesizer', 'drums', 'bass'],
            'mood': 'energetic'
        }
        
        compatibility = await electronic_agent.analyze_compatibility(compatible_request)
        
        assert isinstance(compatibility, float)
        assert 0.0 <= compatibility <= 1.0
        assert compatibility > 0.7  # Should be highly compatible
    
    @pytest.mark.asyncio
    async def test_incompatible_request_analysis(self, electronic_agent):
        """Test analysis of incompatible requests"""
        # Test incompatible request
        incompatible_request = {
            'genre': 'electronic',
            'tempo': 60,  # Too slow for electronic
            'key': 'G major',  # Not preferred for electronic
            'instruments': ['violin', 'cello', 'oboe'],  # Classical instruments
            'mood': 'elegant'  # Not typical for electronic
        }
        
        compatibility = await electronic_agent.analyze_compatibility(incompatible_request)
        
        assert isinstance(compatibility, float)
        assert 0.0 <= compatibility <= 1.0
        assert compatibility < 0.5  # Should be less compatible
    
    @pytest.mark.asyncio
    async def test_tempo_compatibility_calculation(self, electronic_agent):
        """Test tempo compatibility calculation"""
        # Test tempo within range
        assert electronic_agent._calculate_tempo_compatibility(128) == 1.0
        
        # Test tempo outside range but close
        assert electronic_agent._calculate_tempo_compatibility(118) > 0.8
        assert electronic_agent._calculate_tempo_compatibility(142) > 0.8
        
        # Test tempo far outside range
        assert electronic_agent._calculate_tempo_compatibility(60) < 0.5
        assert electronic_agent._calculate_tempo_compatibility(200) < 0.5
    
    @pytest.mark.asyncio
    async def test_key_compatibility_calculation(self, electronic_agent):
        """Test key compatibility calculation"""
        # Test preferred keys
        assert electronic_agent._calculate_key_compatibility('C minor') == 1.0
        assert electronic_agent._calculate_key_compatibility('A minor') == 1.0
        
        # Test non-preferred keys
        assert electronic_agent._calculate_key_compatibility('F# major') < 1.0
        assert electronic_agent._calculate_key_compatibility('G# minor') < 1.0
    
    @pytest.mark.asyncio
    async def test_instrument_compatibility_calculation(self, electronic_agent):
        """Test instrument compatibility calculation"""
        # Test compatible instruments
        assert electronic_agent._calculate_instrument_compatibility(['synthesizer']) > 0.8
        assert electronic_agent._calculate_instrument_compatibility(['drums']) > 0.7
        assert electronic_agent._calculate_instrument_compatibility(['bass']) > 0.6
        
        # Test incompatible instruments
        assert electronic_agent._calculate_instrument_compatibility(['violin']) < 0.5
        assert electronic_agent._calculate_instrument_compatibility(['oboe']) < 0.5
        
        # Test mixed instruments
        mixed_compatibility = electronic_agent._calculate_instrument_compatibility(
            ['synthesizer', 'drums', 'violin']
        )
        assert 0.5 < mixed_compatibility < 0.9
    
    @pytest.mark.asyncio
    async def test_optimization_suggestions(self, electronic_agent):
        """Test genre optimization suggestions"""
        # Test request needing optimization
        suboptimal_request = {
            'tempo': 80,  # Too slow
            'key': 'G major',  # Not preferred
            'instruments': ['violin', 'cello']  # Wrong instruments
        }
        
        suggestions = await electronic_agent.suggest_optimizations(suboptimal_request)
        
        assert isinstance(suggestions, dict)
        assert 'tempo' in suggestions
        assert 'key' in suggestions
        assert 'instruments' in suggestions
        assert 'rhythm_pattern' in suggestions
        assert 'structure' in suggestions
        
        # Check optimization validity
        min_tempo, max_tempo = electronic_agent.genre_characteristics.tempo_range
        assert min_tempo <= suggestions['tempo'] <= max_tempo
        assert suggestions['key'] in electronic_agent.genre_characteristics.key_preferences
        assert len(suggestions['instruments']) > 0
    
    @pytest.mark.asyncio
    async def test_chord_progression_generation(self, electronic_agent, classical_agent, jazz_agent):
        """Test chord progression generation for different genres"""
        # Electronic progressions
        electronic_progressions = await electronic_agent.generate_genre_specific_patterns()
        assert 'chord_progressions' in electronic_progressions
        assert len(electronic_progressions['chord_progressions']) > 0
        
        # Should have electronic-style progressions
        prog_list = electronic_progressions['chord_progressions']
        assert any('i' in str(prog) for prog in prog_list)  # Minor progressions
        
        # Classical progressions
        classical_progressions = await classical_agent.generate_genre_specific_patterns()
        classical_prog_list = classical_progressions['chord_progressions']
        assert any('I' in str(prog) for prog in classical_prog_list)  # Major progressions
        
        # Jazz progressions
        jazz_progressions = await jazz_agent.generate_genre_specific_patterns()
        jazz_prog_list = jazz_progressions['chord_progressions']
        assert any('7' in str(prog) for prog in jazz_prog_list)  # Seventh chords
    
    @pytest.mark.asyncio
    async def test_rhythm_pattern_generation(self, electronic_agent, jazz_agent):
        """Test rhythm pattern generation"""
        electronic_patterns = await electronic_agent.generate_genre_specific_patterns()
        jazz_patterns = await jazz_agent.generate_genre_specific_patterns()
        
        # Electronic should have electronic patterns
        assert 'electronic' in electronic_patterns['rhythm_patterns']
        assert 'syncopated' in electronic_patterns['rhythm_patterns']
        
        # Jazz should have jazz patterns
        assert 'swing' in jazz_patterns['rhythm_patterns']
        assert 'improvised' in jazz_patterns['rhythm_patterns']
    
    @pytest.mark.asyncio
    async def test_melodic_contour_generation(self, electronic_agent, classical_agent):
        """Test melodic contour generation"""
        electronic_patterns = await electronic_agent.generate_genre_specific_patterns()
        classical_patterns = await classical_agent.generate_genre_specific_patterns()
        
        # Electronic contours
        assert 'staccato' in electronic_patterns['melodic_contours']
        assert 'arpeggiated' in electronic_patterns['melodic_contours']
        
        # Classical contours
        assert 'legato' in classical_patterns['melodic_contours']
        assert 'expressive' in classical_patterns['melodic_contours']
    
    @pytest.mark.asyncio
    async def test_bass_pattern_generation(self, jazz_agent, rock_agent):
        """Test bass pattern generation"""
        jazz_patterns = await jazz_agent.generate_genre_specific_patterns()
        rock_patterns = await rock_agent.generate_genre_specific_patterns()
        
        # Jazz bass patterns
        assert 'walking-bass' in jazz_patterns['bass_lines']
        assert 'syncopated' in jazz_patterns['bass_lines']
        
        # Rock bass patterns
        assert 'root-fifth' in rock_patterns['bass_lines']
        assert 'driving' in rock_patterns['bass_lines']
    
    @pytest.mark.asyncio
    async def test_percussion_pattern_generation(self, electronic_agent, rock_agent):
        """Test percussion pattern generation"""
        electronic_patterns = await electronic_agent.generate_genre_specific_patterns()
        rock_patterns = await rock_agent.generate_genre_specific_patterns()
        
        # Electronic percussion
        assert 'four-on-floor' in electronic_patterns['percussion_patterns']
        assert 'techno' in electronic_patterns['percussion_patterns']
        
        # Rock percussion
        assert 'backbeat' in rock_patterns['percussion_patterns']
        assert 'power-drums' in rock_patterns['percussion_patterns']
    
    @pytest.mark.asyncio
    async def test_genre_info_retrieval(self, electronic_agent):
        """Test comprehensive genre information retrieval"""
        genre_info = await electronic_agent.get_genre_info()
        
        assert isinstance(genre_info, dict)
        
        required_keys = [
            'genre', 'characteristics', 'model_version', 'complexity_level',
            'typical_tempo_range', 'preferred_keys', 'signature_instruments',
            'mood_profile'
        ]
        
        for key in required_keys:
            assert key in genre_info
        
        # Validate info content
        assert genre_info['genre'] == 'electronic'
        assert genre_info['model_version'] == '1.3.0'
        assert isinstance(genre_info['characteristics'], GenreCharacteristics)
        assert len(genre_info['preferred_keys']) > 0
        assert len(genre_info['signature_instruments']) > 0
        assert len(genre_info['mood_profile']) > 0
    
    @pytest.mark.asyncio
    async def test_all_genre_agents_initialization(self):
        """Test initialization of all genre agents"""
        genres = list(MusicGenre)
        
        for genre in genres:
            agent = GenreSpecialistAgent(genre)
            await agent.initialize()
            
            assert agent._initialized
            assert agent.genre == genre
            assert hasattr(agent, 'genre_characteristics')
            
            # Test basic functionality
            compatibility = await agent.analyze_compatibility({
                'tempo': 120,
                'key': 'C major',
                'instruments': ['piano'],
                'mood': 'neutral'
            })
            
            assert isinstance(compatibility, float)
            assert 0.0 <= compatibility <= 1.0
    
    @pytest.mark.asyncio
    async def test_genre_specific_optimization(self):
        """Test genre-specific optimization for various genres"""
        test_cases = [
            (MusicGenre.CLASSICAL, {
                'tempo': 200,  # Too fast
                'key': 'C minor',  # Major preferred
                'instruments': ['synthesizer']  # Electronic instruments
            }),
            (MusicGenre.JAZZ, {
                'tempo': 60,  # Too slow
                'key': 'C major',  # Jazz keys preferred
                'instruments': ['violin']  # Classical instruments
            }),
            (MusicGenre.ROCK, {
                'tempo': 80,  # Slow for rock
                'key': 'C minor',  # Major preferred
                'instruments': ['synthesizer']  # Guitar/bass preferred
            })
        ]
        
        for genre, request in test_cases:
            agent = GenreSpecialistAgent(genre)
            await agent.initialize()
            
            suggestions = await agent.suggest_optimizations(request)
            
            # Validate suggestions improve compatibility
            assert 'tempo' in suggestions
            assert 'key' in suggestions
            assert 'instruments' in suggestions
            
            # Check that suggestions are genre-appropriate
            min_tempo, max_tempo = agent.genre_characteristics.tempo_range
            assert min_tempo <= suggestions['tempo'] <= max_tempo
            assert suggestions['key'] in agent.genre_characteristics.key_preferences
    
    @pytest.mark.asyncio
    async def test_concurrent_genre_analysis(self):
        """Test concurrent analysis with multiple genre agents"""
        genres = [MusicGenre.ELECTRONIC, MusicGenre.CLASSICAL, MusicGenre.JAZZ]
        
        # Create agents
        agents = []
        for genre in genres:
            agent = GenreSpecialistAgent(genre)
            await agent.initialize()
            agents.append(agent)
        
        # Analyze compatibility concurrently
        test_request = {
            'tempo': 120,
            'key': 'C major',
            'instruments': ['piano', 'drums'],
            'mood': 'neutral'
        }
        
        tasks = [agent.analyze_compatibility(test_request) for agent in agents]
        results = await asyncio.gather(*tasks)
        
        assert len(results) == len(agents)
        for result in results:
            assert isinstance(result, float)
            assert 0.0 <= result <= 1.0
        
        # Electronic should be least compatible with piano-focused request
        # Classical should be most compatible
        assert results[1] > results[0]  # Classical > Electronic

class TestMusicGenre:
    """Test suite for MusicGenre enum"""
    
    def test_genre_enum_values(self):
        """Test music genre enum values"""
        assert MusicGenre.ELECTRONIC.value == "electronic"
        assert MusicGenre.CLASSICAL.value == "classical"
        assert MusicGenre.JAZZ.value == "jazz"
        assert MusicGenre.ROCK.value == "rock"
        assert MusicGenre.POP.value == "pop"
        assert MusicGenre.HIP_HOP.value == "hip_hop"
        assert MusicGenre.AMBIENT.value == "ambient"
        assert MusicGenre.EXPERIMENTAL.value == "experimental"
        assert MusicGenre.BLUES.value == "blues"
        assert MusicGenre.COUNTRY.value == "country"
        assert MusicGenre.FOLK.value == "folk"
        assert MusicGenre.METAL.value == "metal"
        assert MusicGenre.REGGAE.value == "reggae"
        assert MusicGenre.WORLD.value == "world"
    
    def test_all_genres_covered(self):
        """Test that all major genres are covered"""
        all_genres = list(MusicGenre)
        
        # Should have at least 14 genres
        assert len(all_genres) >= 14
        
        # Should include major categories
        genre_values = [genre.value for genre in all_genres]
        assert "electronic" in genre_values
        assert "classical" in genre_values
        assert "jazz" in genre_values
        assert "rock" in genre_values
        assert "pop" in genre_values

# Performance Tests

class TestGenreAgentPerformance:
    """Performance tests for genre specialist agents"""
    
    @pytest.mark.asyncio
    async def test_analysis_performance(self):
        """Test performance of compatibility analysis"""
        agent = GenreSpecialistAgent(MusicGenre.ELECTRONIC)
        await agent.initialize()
        
        import time
        
        test_requests = [
            {
                'tempo': 120,
                'key': 'C major',
                'instruments': ['synthesizer', 'drums'],
                'mood': 'energetic'
            } for _ in range(100)
        ]
        
        start_time = time.time()
        
        # Analyze many requests
        for request in test_requests:
            compatibility = await agent.analyze_compatibility(request)
            assert 0.0 <= compatibility <= 1.0
        
        total_time = time.time() - start_time
        avg_time = total_time / len(test_requests)
        
        # Should be fast - less than 0.01 seconds per analysis
        assert avg_time < 0.01
    
    @pytest.mark.asyncio
    async def test_pattern_generation_performance(self):
        """Test performance of pattern generation"""
        agent = GenreSpecialistAgent(MusicGenre.ELECTRONIC)
        await agent.initialize()
        
        import time
        
        start_time = time.time()
        
        # Generate patterns multiple times
        for i in range(10):
            patterns = await agent.generate_genre_specific_patterns()
            assert len(patterns) > 0
        
        total_time = time.time() - start_time
        avg_time = total_time / 10
        
        # Should be reasonably fast
        assert avg_time < 0.1
    
    @pytest.mark.asyncio
    async def test_memory_usage(self):
        """Test memory usage of genre agents"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create multiple agents
        agents = []
        for genre in list(MusicGenre)[:5]:  # Test first 5 genres
            agent = GenreSpecialistAgent(genre)
            await agent.initialize()
            agents.append(agent)
        
        memory_after = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = memory_after - memory_before
        
        # Memory usage should be reasonable
        assert memory_increase < 50  # Less than 50MB for 5 agents