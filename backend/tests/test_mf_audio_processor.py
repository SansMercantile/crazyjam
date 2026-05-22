"""
CrazyJam Audio Processor Tests - Comprehensive testing for audio processing and manipulation
"""

import pytest
import asyncio
import logging
import numpy as np
from unittest.mock import Mock, patch
import tempfile
import os

# Import CrazyJam system components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from constellation.CrazyJam.backend.core.audio_processor import (
    AudioProcessor,
    AudioConfig,
    AudioSegment,
    AudioFormat
)
from constellation.CrazyJam.backend.core.composition_engine import MusicalNote

logger = logging.getLogger(__name__)

class TestAudioProcessor:
    """Test suite for CrazyJam Audio Processor"""
    
    @pytest.fixture
    async def audio_processor(self):
        """Create an audio processor instance for testing"""
        config = AudioConfig(
            sample_rate=44100,
            bit_depth=16,
            channels=2,
            format=AudioFormat.WAV
        )
        processor = AudioProcessor(config)
        await processor.initialize()
        return processor
    
    @pytest.fixture
    def sample_musical_notes(self):
        """Sample musical notes for testing"""
        notes = [
            MusicalNote(pitch=60, velocity=100, duration=1.0, start_time=0.0, instrument=1),
            MusicalNote(pitch=64, velocity=90, duration=0.5, start_time=1.0, instrument=1),
            MusicalNote(pitch=67, velocity=95, duration=1.0, start_time=1.5, instrument=1),
            MusicalNote(pitch=72, velocity=85, duration=0.5, start_time=2.5, instrument=1),
            MusicalNote(pitch=76, velocity=80, duration=1.0, start_time=3.0, instrument=1)
        ]
        return notes
    
    @pytest.mark.asyncio
    async def test_processor_initialization(self):
        """Test audio processor initialization"""
        config = AudioConfig(sample_rate=48000, bit_depth=24, channels=2)
        processor = AudioProcessor(config)
        
        assert not processor._initialized
        assert processor.config.sample_rate == 48000
        assert processor.config.bit_depth == 24
        assert processor.config.channels == 2
        
        await processor.initialize()
        
        assert processor._initialized
        assert len(processor.effects_chain) > 0
        assert 'equalizer' in processor.effects_chain
        assert 'compressor' in processor.effects_chain
    
    @pytest.mark.asyncio
    async def test_render_to_audio(self, audio_processor, sample_musical_notes):
        """Test rendering musical notes to audio"""
        audio_segment = await audio_processor.render_to_audio(sample_musical_notes)
        
        assert isinstance(audio_segment, AudioSegment)
        assert len(audio_segment.data) > 0
        assert audio_segment.sample_rate == 44100
        assert audio_segment.channels == 2
        assert audio_segment.duration > 0
        assert audio_segment.start_time == 0.0
        
        # Check audio data properties
        assert audio_segment.data.dtype == np.float32
        assert audio_segment.data.shape[1] == 2  # Stereo channels
        
        # Check duration matches expected (last note ends at 4.0 seconds)
        assert 3.5 <= audio_segment.duration <= 4.5  # Allow some tolerance
    
    @pytest.mark.asyncio
    async def test_audio_segment_properties(self, audio_processor):
        """Test audio segment properties and validation"""
        # Create a simple test audio segment
        duration_samples = int(2.0 * audio_processor.config.sample_rate)
        test_data = np.zeros((duration_samples, 2), dtype=np.float32)
        
        segment = AudioSegment(
            data=test_data,
            sample_rate=44100,
            start_time=0.0,
            duration=2.0,
            channels=2
        )
        
        assert segment.sample_rate == 44100
        assert segment.start_time == 0.0
        assert segment.duration == 2.0
        assert segment.channels == 2
        assert len(segment.data) == duration_samples
    
    @pytest.mark.asyncio
    async def test_single_note_synthesis(self, audio_processor):
        """Test synthesis of individual musical notes"""
        note = MusicalNote(pitch=60, velocity=100, duration=1.0, start_time=0.0, instrument=1)
        
        # Synthesize the note
        audio_data = await audio_processor._synthesize_single_note(note, audio_processor.config)
        
        assert isinstance(audio_data, np.ndarray)
        assert audio_data.dtype == np.float32
        assert audio_data.shape[1] == 2  # Stereo
        assert len(audio_data) == int(1.0 * audio_processor.config.sample_rate)
        
        # Check that audio is not silent
        assert np.max(np.abs(audio_data)) > 0
    
    @pytest.mark.asyncio
    async def test_pitch_to_frequency_conversion(self, audio_processor):
        """Test MIDI pitch to frequency conversion"""
        test_notes = [
            MusicalNote(pitch=60, velocity=100, duration=0.5, start_time=0.0, instrument=1),  # C4 = 440Hz
            MusicalNote(pitch=69, velocity=100, duration=0.5, start_time=1.0, instrument=1),  # A4 = 440Hz
            MusicalNote(pitch=72, velocity=100, duration=0.5, start_time=2.0, instrument=1),  # C5
        ]
        
        for note in test_notes:
            audio_data = await audio_processor._synthesize_single_note(note, audio_processor.config)
            assert len(audio_data) > 0
            assert np.max(np.abs(audio_data)) > 0
    
    @pytest.mark.asyncio
    async def test_velocity_impact_on_audio(self, audio_processor):
        """Test that velocity affects audio amplitude"""
        quiet_note = MusicalNote(pitch=60, velocity=40, duration=1.0, start_time=0.0, instrument=1)
        loud_note = MusicalNote(pitch=60, velocity=120, duration=1.0, start_time=0.0, instrument=1)
        
        quiet_audio = await audio_processor._synthesize_single_note(quiet_note, audio_processor.config)
        loud_audio = await audio_processor._synthesize_single_note(loud_note, audio_processor.config)
        
        quiet_amplitude = np.max(np.abs(quiet_audio))
        loud_amplitude = np.max(np.abs(loud_audio))
        
        # Loud note should have higher amplitude
        assert loud_amplitude > quiet_amplitude
        assert quiet_amplitude > 0
        assert loud_amplitude > 0
    
    @pytest.mark.asyncio
    async def test_adsr_envelope_generation(self, audio_processor):
        """Test ADSR envelope generation"""
        duration = 2.0
        sample_rate = audio_processor.config.sample_rate
        envelope = audio_processor._generate_adsr_envelope(duration, sample_rate)
        
        assert isinstance(envelope, np.ndarray)
        assert len(envelope) == int(duration * sample_rate)
        
        # Check envelope properties
        assert np.max(envelope) <= 1.0
        assert np.min(envelope) >= 0.0
        
        # Check that envelope starts at 0 (attack)
        assert envelope[0] == 0.0
        
        # Check that envelope ends at 0 (release)
        assert envelope[-1] == 0.0
        
        # Check that envelope reaches maximum (attack/sustain)
        assert np.max(envelope) > 0.5
    
    @pytest.mark.asyncio
    async def test_apply_effects(self, audio_processor, sample_musical_notes):
        """Test applying audio effects"""
        # Generate base audio
        audio_segment = await audio_processor.render_to_audio(sample_musical_notes)
        
        # Apply effects
        effects = ['equalizer', 'compressor', 'reverb']
        processed_segment = await audio_processor.apply_effects(audio_segment, effects)
        
        assert isinstance(processed_segment, AudioSegment)
        assert len(processed_segment.data) == len(audio_segment.data)
        assert processed_segment.sample_rate == audio_segment.sample_rate
        assert processed_segment.duration == audio_segment.duration
        
        # Audio should be different after effects
        assert not np.array_equal(processed_segment.data, audio_segment.data)
    
    @pytest.mark.asyncio
    async def test_individual_effects(self, audio_processor):
        """Test individual audio effects"""
        # Create test audio data
        test_data = np.random.randn(44100, 2).astype(np.float32) * 0.1
        
        # Test each effect
        effects = ['equalizer', 'compressor', 'reverb', 'delay', 'chorus']
        
        for effect in effects:
            processed_data = await audio_processor._apply_effect(test_data, effect)
            
            assert isinstance(processed_data, np.ndarray)
            assert processed_data.shape == test_data.shape
            assert processed_data.dtype == test_data.dtype
    
    @pytest.mark.asyncio
    async def test_compressor_effect(self, audio_processor):
        """Test compressor effect specifically"""
        # Create audio with high peaks
        test_data = np.zeros((44100, 2), dtype=np.float32)
        test_data[1000:2000, :] = 1.0  # High peak
        test_data[10000:11000, :] = 0.5  # Medium peak
        
        processed_data = await audio_processor._apply_compressor(test_data)
        
        # Peak should be reduced
        original_peak = np.max(np.abs(test_data))
        compressed_peak = np.max(np.abs(processed_data))
        
        assert compressed_peak < original_peak
        assert compressed_peak <= 0.8  # Compressor threshold
    
    @pytest.mark.asyncio
    async def test_reverb_effect(self, audio_processor):
        """Test reverb effect"""
        # Create simple impulse
        test_data = np.zeros((44100, 2), dtype=np.float32)
        test_data[1000, :] = 1.0  # Single impulse
        
        processed_data = await audio_processor._apply_reverb(test_data)
        
        # Should have decay after impulse
        assert np.max(processed_data[2000:5000, :]) > 0  # Reverb tail
        assert np.max(processed_data[1000, :]) == 1.0  # Original impulse preserved
    
    @pytest.mark.asyncio
    async def test_delay_effect(self, audio_processor):
        """Test delay effect"""
        # Create simple impulse
        test_data = np.zeros((44100, 2), dtype=np.float32)
        test_data[1000, :] = 1.0  # Single impulse
        
        processed_data = await audio_processor._apply_delay(test_data)
        
        # Should have delayed repetition
        delay_samples = int(0.2 * 44100)  # 200ms delay
        assert processed_data[1000, 0] == 1.0  # Original impulse
        assert processed_data[1000 + delay_samples, 0] > 0  # Delayed echo
    
    @pytest.mark.asyncio
    async def test_export_audio(self, audio_processor, sample_musical_notes):
        """Test audio export functionality"""
        # Generate audio
        audio_segment = await audio_processor.render_to_audio(sample_musical_notes)
        
        # Export to different formats
        formats = [AudioFormat.WAV, AudioFormat.MP3, AudioFormat.FLAC]
        
        for format_type in formats:
            export_info = await audio_processor.export_audio(
                audio_segment, 
                f"test_output", 
                format_type
            )
            
            assert isinstance(export_info, dict)
            assert 'path' in export_info
            assert 'format' in export_info
            assert 'sample_rate' in export_info
            assert 'channels' in export_info
            assert 'duration' in export_info
            assert 'size_bytes' in export_info
            
            assert export_info['format'] == format_type.value
            assert export_info['sample_rate'] == audio_segment.sample_rate
            assert export_info['channels'] == audio_segment.channels
            assert export_info['size_bytes'] > 0
    
    @pytest.mark.asyncio
    async def test_analyze_audio(self, audio_processor, sample_musical_notes):
        """Test audio analysis functionality"""
        # Generate audio
        audio_segment = await audio_processor.render_to_audio(sample_musical_notes)
        
        # Analyze audio
        analysis = await audio_processor.analyze_audio(audio_segment)
        
        assert isinstance(analysis, dict)
        
        required_keys = [
            'rms_level', 'peak_level', 'zero_crossings', 'duration',
            'sample_rate', 'channels', 'dynamic_range', 'estimated_bitrate'
        ]
        
        for key in required_keys:
            assert key in analysis
        
        # Validate analysis values
        assert analysis['rms_level'] >= 0
        assert analysis['peak_level'] >= 0
        assert analysis['zero_crossings'] >= 0
        assert analysis['duration'] == audio_segment.duration
        assert analysis['sample_rate'] == audio_segment.sample_rate
        assert analysis['channels'] == audio_segment.channels
        assert analysis['dynamic_range'] >= 0
        assert analysis['estimated_bitrate'] > 0
    
    @pytest.mark.asyncio
    async def test_audio_normalization(self, audio_processor):
        """Test audio normalization during synthesis"""
        # Create notes with very high velocity
        loud_notes = [
            MusicalNote(pitch=60, velocity=127, duration=1.0, start_time=0.0, instrument=1),
            MusicalNote(pitch=64, velocity=127, duration=1.0, start_time=1.0, instrument=1),
        ]
        
        audio_segment = await audio_processor.render_to_audio(loud_notes)
        
        # Check that audio is normalized
        peak_level = np.max(np.abs(audio_segment.data))
        assert peak_level <= 1.0  # Should not exceed 0dB
        assert peak_level > 0.5   # Should be reasonably loud
    
    @pytest.mark.asyncio
    async def test_stereo_audio_generation(self, audio_processor):
        """Test stereo audio generation"""
        note = MusicalNote(pitch=60, velocity=100, duration=1.0, start_time=0.0, instrument=1)
        
        # Test with stereo config
        stereo_config = AudioConfig(channels=2)
        stereo_processor = AudioProcessor(stereo_config)
        await stereo_processor.initialize()
        
        stereo_audio = await stereo_processor._synthesize_single_note(note, stereo_config)
        
        assert stereo_audio.shape[1] == 2  # Stereo channels
        assert np.array_equal(stereo_audio[:, 0], stereo_audio[:, 1])  # Mono content in stereo
    
    @pytest.mark.asyncio
    async def test_mono_audio_generation(self, audio_processor):
        """Test mono audio generation"""
        note = MusicalNote(pitch=60, velocity=100, duration=1.0, start_time=0.0, instrument=1)
        
        # Test with mono config
        mono_config = AudioConfig(channels=1)
        mono_processor = AudioProcessor(mono_config)
        await mono_processor.initialize()
        
        mono_audio = await mono_processor._synthesize_single_note(note, mono_config)
        
        assert mono_audio.shape[1] == 1  # Mono channel
        assert len(mono_audio) > 0
    
    @pytest.mark.asyncio
    async def test_different_sample_rates(self):
        """Test audio processing with different sample rates"""
        note = MusicalNote(pitch=60, velocity=100, duration=1.0, start_time=0.0, instrument=1)
        
        sample_rates = [22050, 44100, 48000, 96000]
        
        for sr in sample_rates:
            config = AudioConfig(sample_rate=sr)
            processor = AudioProcessor(config)
            await processor.initialize()
            
            audio_data = await processor._synthesize_single_note(note, config)
            
            assert audio_data.shape[0] == int(1.0 * sr)  # Correct number of samples
            assert np.max(np.abs(audio_data)) > 0  # Not silent
    
    @pytest.mark.asyncio
    async def test_performance_benchmarking(self, audio_processor, sample_musical_notes):
        """Test audio processing performance"""
        import time
        
        start_time = time.time()
        
        # Process multiple audio segments
        for i in range(5):
            audio_segment = await audio_processor.render_to_audio(sample_musical_notes)
            processed_segment = await audio_processor.apply_effects(
                audio_segment, 
                ['equalizer', 'compressor', 'reverb']
            )
            assert len(processed_segment.data) > 0
        
        total_time = time.time() - start_time
        avg_time = total_time / 5
        
        # Should complete reasonably quickly
        assert avg_time < 2.0  # Less than 2 seconds per render+effects
    
    @pytest.mark.asyncio
    async def test_concurrent_audio_processing(self, audio_processor, sample_musical_notes):
        """Test concurrent audio processing"""
        # Process multiple audio segments concurrently
        tasks = []
        for i in range(3):
            task = audio_processor.render_to_audio(sample_musical_notes)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 3
        for result in results:
            assert isinstance(result, AudioSegment)
            assert len(result.data) > 0
            assert result.duration > 0

class TestAudioConfig:
    """Test suite for AudioConfig dataclass"""
    
    def test_audio_config_creation(self):
        """Test creating audio configurations"""
        config = AudioConfig(
            sample_rate=48000,
            bit_depth=24,
            channels=2,
            format=AudioFormat.FLAC
        )
        
        assert config.sample_rate == 48000
        assert config.bit_depth == 24
        assert config.channels == 2
        assert config.format == AudioFormat.FLAC
    
    def test_audio_config_defaults(self):
        """Test audio configuration default values"""
        config = AudioConfig()
        
        assert config.sample_rate == 44100
        assert config.bit_depth == 16
        assert config.channels == 2
        assert config.format == AudioFormat.WAV

class TestAudioFormat:
    """Test suite for AudioFormat enum"""
    
    def test_audio_format_values(self):
        """Test audio format enum values"""
        assert AudioFormat.WAV.value == "wav"
        assert AudioFormat.MP3.value == "mp3"
        assert AudioFormat.FLAC.value == "flac"
        assert AudioFormat.OGG.value == "ogg"
        assert AudioFormat.AIFF.value == "aiff"

# Integration Tests

class TestAudioProcessorIntegration:
    """Integration tests for audio processor with other components"""
    
    @pytest.mark.asyncio
    async def test_full_audio_workflow(self):
        """Test complete audio workflow from notes to processed audio"""
        # Create processor
        config = AudioConfig(sample_rate=44100, channels=2)
        processor = AudioProcessor(config)
        await processor.initialize()
        
        # Create complex musical notes
        notes = [
            MusicalNote(pitch=60, velocity=100, duration=0.5, start_time=0.0, instrument=1),
            MusicalNote(pitch=64, velocity=90, duration=0.5, start_time=0.5, instrument=2),
            MusicalNote(pitch=67, velocity=95, duration=1.0, start_time=1.0, instrument=3),
            MusicalNote(pitch=72, velocity=85, duration=0.5, start_time=2.0, instrument=4),
            MusicalNote(pitch=76, velocity=80, duration=1.0, start_time=2.5, instrument=5),
            MusicalNote(pitch=79, velocity=75, duration=1.0, start_time=3.5, instrument=6),
        ]
        
        # Render to audio
        audio_segment = await processor.render_to_audio(notes)
        
        # Apply effects chain
        effects = ['equalizer', 'compressor', 'reverb', 'delay']
        processed_segment = await processor.apply_effects(audio_segment, effects)
        
        # Analyze final audio
        analysis = await processor.analyze_audio(processed_segment)
        
        # Export final result
        export_info = await processor.export_audio(processed_segment, "final_output")
        
        # Validate complete workflow
        assert isinstance(audio_segment, AudioSegment)
        assert isinstance(processed_segment, AudioSegment)
        assert isinstance(analysis, dict)
        assert isinstance(export_info, dict)
        
        # Check audio quality
        assert len(processed_segment.data) > 0
        assert analysis['rms_level'] > 0
        assert analysis['peak_level'] > 0
        assert export_info['size_bytes'] > 0
        
        # Check that processing made a difference
        assert not np.array_equal(audio_segment.data, processed_segment.data)
        assert export_info['duration'] == processed_segment.duration