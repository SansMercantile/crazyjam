"""
CrazyJamazyJam Composition Engine Tests - Comprehensive testing for AI music composition
"""

import pytest
import asyncio
import logging
from unittest.mock import Mock, patch
import numpy as np
import time

# Import CrazyJam system components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from constellation.CrazyJam.backend.core.composition_engine import (
    CompositionEngine, 
    CompositionRequest, 
    CompositionResult,
    MusicalNote,
    CompositionStyle
)

logger = logging.getLogger(__name__)

class TestCompositionEngine:
    """Test suite for CrazyJam Composition Engine"""
    
    @pytest.fixture
    async def composition_engine(self):
        """Create a composition engine instance for testing"""
        engine = CompositionEngine()
        await engine.initialize()
        return engine
    
    @pytest.fixture
    def sample_composition_request(self):
        """Sample composition request for testing"""
        return CompositionRequest(
            genre="electronic",
            mood="energetic",
            tempo=128,
            key="C minor",
            duration=180,  # 3 minutes
            instruments=["synthesizer", "drums", "bass"],
            style="progressive house",
            complexity=0.7
        )
    
    @pytest.mark.asyncio
    async def test_engine_initialization(self):
        """Test composition engine initialization"""
        engine = CompositionEngine()
        assert not engine._initialized
        
        await engine.initialize()
        
        assert engine._initialized
        assert engine.model_version == "2.1.0"
        assert len(engine.loaded_models) > 0
        assert 'harmony_model' in engine.loaded_models
        assert 'rhythm_model' in engine.loaded_models
    
    @pytest.mark.asyncio
    async def test_composition_generation(self, composition_engine, sample_composition_request):
        """Test basic composition generation"""
        result = await composition_engine.compose(sample_composition_request)
        
        assert isinstance(result, CompositionResult)
        assert len(result.notes) > 0
        assert result.metadata['genre'] == "electronic"
        assert result.metadata['mood'] == "energetic"
        assert result.metadata['tempo'] == 128
        assert result.model_version == "2.1.0"
        assert 0.0 <= result.quality_score <= 1.0
        assert result.generation_time > 0
    
    @pytest.mark.asyncio
    async def test_composition_with_different_genres(self, composition_engine):
        """Test composition generation with different genres"""
        genres = ["electronic", "classical", "jazz", "rock", "pop"]
        
        for genre in genres:
            request = CompositionRequest(
                genre=genre,
                mood="neutral",
                tempo=120,
                key="C major",
                duration=60,
                instruments=["piano"],
                style="standard"
            )
            
            result = await composition_engine.compose(request)
            assert len(result.notes) > 0
            assert result.metadata['genre'] == genre
    
    @pytest.mark.asyncio
    async def test_composition_quality_metrics(self, composition_engine, sample_composition_request):
        """Test composition quality metrics"""
        result = await composition_engine.compose(sample_composition_request)
        
        # Check quality score is reasonable
        assert 0.5 <= result.quality_score <= 1.0
        
        # Check metadata completeness
        required_metadata = ['genre', 'style', 'mood', 'tempo', 'key', 'instruments', 'note_count']
        for key in required_metadata:
            assert key in result.metadata
        
        # Check note properties
        for note in result.notes[:5]:  # Check first 5 notes
            assert 0 <= note.pitch <= 127
            assert 0 <= note.velocity <= 127
            assert note.duration > 0
            assert note.start_time >= 0
            assert note.instrument >= 0
    
    @pytest.mark.asyncio
    async def test_tempo_impact_on_composition(self, composition_engine):
        """Test that tempo affects composition generation"""
        slow_request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=80,
            key="C major",
            duration=60,
            instruments=["synthesizer"],
            style="standard"
        )
        
        fast_request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=140,
            key="C major",
            duration=60,
            instruments=["synthesizer"],
            style="standard"
        )
        
        slow_result = await composition_engine.compose(slow_request)
        fast_result = await composition_engine.compose(fast_request)
        
        # Both should generate compositions
        assert len(slow_result.notes) > 0
        assert len(fast_result.notes) > 0
        
        # Tempo should be reflected in metadata
        assert slow_result.metadata['tempo'] == 80
        assert fast_result.metadata['tempo'] == 140
    
    @pytest.mark.asyncio
    async def test_mood_impact_on_composition(self, composition_engine):
        """Test that mood affects composition generation"""
        moods = ["energetic", "calm", "dark", "bright", "melancholic", "upbeat"]
        
        for mood in moods:
            request = CompositionRequest(
                genre="electronic",
                mood=mood,
                tempo=120,
                key="C major",
                duration=60,
                instruments=["synthesizer"],
                style="standard"
            )
            
            result = await composition_engine.compose(request)
            assert len(result.notes) > 0
            assert result.metadata['mood'] == mood
    
    @pytest.mark.asyncio
    async def test_complexity_parameter(self, composition_engine):
        """Test complexity parameter affects composition"""
        simple_request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=120,
            key="C major",
            duration=60,
            instruments=["synthesizer"],
            style="standard",
            complexity=0.1
        )
        
        complex_request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=120,
            key="C major",
            duration=60,
            instruments=["synthesizer"],
            style="standard",
            complexity=0.9
        )
        
        simple_result = await composition_engine.compose(simple_request)
        complex_result = await composition_engine.compose(complex_request)
        
        # Both should generate valid compositions
        assert len(simple_result.notes) > 0
        assert len(complex_result.notes) > 0
        
        # Complexity should be reflected in metadata
        assert simple_result.metadata['complexity'] == 0.1
        assert complex_result.metadata['complexity'] == 0.9
    
    @pytest.mark.asyncio
    async def test_key_conversion(self, composition_engine):
        """Test musical key to MIDI pitch conversion"""
        keys = ["C major", "C minor", "D major", "D minor", "E major", "E minor"]
        
        for key in keys:
            request = CompositionRequest(
                genre="electronic",
                mood="neutral",
                tempo=120,
                key=key,
                duration=30,
                instruments=["synthesizer"],
                style="standard"
            )
            
            result = await composition_engine.compose(request)
            assert len(result.notes) > 0
            assert result.metadata['key'] == key
    
    @pytest.mark.asyncio
    async def test_available_genres(self, composition_engine):
        """Test getting available genres"""
        genres = await composition_engine.get_available_genres()
        
        assert isinstance(genres, list)
        assert len(genres) > 0
        assert "electronic" in genres
        assert "classical" in genres
        assert "jazz" in genres
        assert "rock" in genres
        assert "pop" in genres
    
    @pytest.mark.asyncio
    async def test_available_styles(self, composition_engine):
        """Test getting available styles for genres"""
        # Test electronic genre
        electronic_styles = await composition_engine.get_available_styles("electronic")
        assert isinstance(electronic_styles, list)
        assert len(electronic_styles) > 0
        assert "house" in electronic_styles
        
        # Test rock genre
        rock_styles = await composition_engine.get_available_styles("rock")
        assert isinstance(rock_styles, list)
        assert len(rock_styles) > 0
        assert "classic" in rock_styles
    
    @pytest.mark.asyncio
    async def test_performance_benchmarking(self, composition_engine, sample_composition_request):
        """Test composition generation performance"""
        start_time = time.time()
        
        # Generate multiple compositions
        compositions = []
        for i in range(5):
            result = await composition_engine.compose(sample_composition_request)
            compositions.append(result)
        
        total_time = time.time() - start_time
        avg_time = total_time / len(compositions)
        
        # Performance assertions
        assert avg_time < 5.0  # Should complete in under 5 seconds per composition
        assert len(compositions) == 5
        
        # All compositions should be valid
        for result in compositions:
            assert len(result.notes) > 0
            assert result.quality_score > 0
    
    @pytest.mark.asyncio
    async def test_concurrent_composition_generation(self, composition_engine):
        """Test concurrent composition generation"""
        requests = []
        for i in range(3):
            request = CompositionRequest(
                genre="electronic",
                mood="energetic",
                tempo=120 + i * 10,
                key="C major",
                duration=60,
                instruments=["synthesizer"],
                style="standard"
            )
            requests.append(request)
        
        # Generate compositions concurrently
        tasks = [composition_engine.compose(req) for req in requests]
        results = await asyncio.gather(*tasks)
        
        # All should complete successfully
        assert len(results) == 3
        for i, result in enumerate(results):
            assert len(result.notes) > 0
            assert result.metadata['tempo'] == 120 + i * 10
    
    @pytest.mark.asyncio
    async def test_error_handling(self, composition_engine):
        """Test error handling for invalid requests"""
        # Test with extremely high tempo
        invalid_request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=1000,  # Invalid tempo
            key="C major",
            duration=60,
            instruments=["synthesizer"],
            style="standard"
        )
        
        # Should handle gracefully
        result = await composition_engine.compose(invalid_request)
        assert isinstance(result, CompositionResult)
        assert len(result.notes) > 0  # Should still generate something
    
    @pytest.mark.asyncio
    async def test_memory_usage(self, composition_engine, sample_composition_request):
        """Test memory usage during composition generation"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Generate multiple compositions
        for i in range(10):
            result = await composition_engine.compose(sample_composition_request)
            assert len(result.notes) > 0
        
        memory_after = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = memory_after - memory_before
        
        # Memory increase should be reasonable (less than 100MB for 10 compositions)
        assert memory_increase < 100
    
    @pytest.mark.asyncio
    async def test_note_validation(self, composition_engine):
        """Test that generated notes are valid MIDI notes"""
        request = CompositionRequest(
            genre="electronic",
            mood="energetic",
            tempo=128,
            key="C minor",
            duration=120,
            instruments=["synthesizer", "drums", "bass"],
            style="techno"
        )
        
        result = await composition_engine.compose(request)
        
        # Validate all notes
        for note in result.notes:
            assert 0 <= note.pitch <= 127, f"Invalid pitch: {note.pitch}"
            assert 0 <= note.velocity <= 127, f"Invalid velocity: {note.velocity}"
            assert note.duration > 0, f"Invalid duration: {note.duration}"
            assert note.start_time >= 0, f"Invalid start time: {note.start_time}"
            assert note.instrument >= 0, f"Invalid instrument: {note.instrument}"
            
            # Check that end time is within composition duration
            assert note.start_time + note.duration <= request.duration + 1.0  # Allow 1 second tolerance

class TestMusicalNote:
    """Test suite for MusicalNote dataclass"""
    
    def test_musical_note_creation(self):
        """Test creating musical notes"""
        note = MusicalNote(
            pitch=60,  # C4
            velocity=100,
            duration=1.0,
            start_time=0.0,
            instrument=1
        )
        
        assert note.pitch == 60
        assert note.velocity == 100
        assert note.duration == 1.0
        assert note.start_time == 0.0
        assert note.instrument == 1
    
    def test_musical_note_boundaries(self):
        """Test musical note boundary values"""
        # Test minimum values
        min_note = MusicalNote(0, 0, 0.01, 0.0, 0)
        assert min_note.pitch == 0
        assert min_note.velocity == 0
        assert min_note.duration == 0.01
        assert min_note.start_time == 0.0
        assert min_note.instrument == 0
        
        # Test maximum values
        max_note = MusicalNote(127, 127, 10.0, 100.0, 1000)
        assert max_note.pitch == 127
        assert max_note.velocity == 127
        assert max_note.duration == 10.0
        assert max_note.start_time == 100.0
        assert max_note.instrument == 1000

class TestCompositionRequest:
    """Test suite for CompositionRequest dataclass"""
    
    def test_composition_request_creation(self):
        """Test creating composition requests"""
        request = CompositionRequest(
            genre="electronic",
            mood="energetic",
            tempo=128,
            key="C minor",
            duration=180,
            instruments=["synthesizer", "drums"],
            style="techno",
            complexity=0.7
        )
        
        assert request.genre == "electronic"
        assert request.mood == "energetic"
        assert request.tempo == 128
        assert request.key == "C minor"
        assert request.duration == 180
        assert request.instruments == ["synthesizer", "drums"]
        assert request.style == "techno"
        assert request.complexity == 0.7
    
    def test_composition_request_defaults(self):
        """Test composition request default values"""
        request = CompositionRequest(
            genre="electronic",
            mood="neutral",
            tempo=120,
            key="C major",
            duration=60,
            instruments=["piano"],
            style="standard"
        )
        
        # Should have default complexity
        assert request.complexity == 0.5

# Integration Tests

class TestCompositionEngineIntegration:
    """Integration tests for composition engine with other components"""
    
    @pytest.mark.asyncio
    async def test_full_composition_workflow(self):
        """Test complete composition workflow from request to final result"""
        engine = CompositionEngine()
        await engine.initialize()
        
        # Create a complex request
        request = CompositionRequest(
            genre="electronic",
            mood="energetic",
            tempo=128,
            key="C minor",
            duration=240,  # 4 minutes
            instruments=["synthesizer", "drums", "bass", "pad", "lead"],
            style="progressive house",
            complexity=0.8
        )
        
        # Generate composition
        result = await engine.compose(request)
        
        # Validate the complete result
        assert isinstance(result, CompositionResult)
        assert len(result.notes) > 50  # Should have substantial content
        assert result.metadata['note_count'] == len(result.notes)
        assert result.quality_score > 0.7  # High complexity should yield good quality
        assert result.generation_time < 10.0  # Should be reasonably fast
        
        # Validate metadata completeness
        for key, value in result.metadata.items():
            assert value is not None
            assert value != ""