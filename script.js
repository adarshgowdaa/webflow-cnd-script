document.addEventListener("DOMContentLoaded", function () {

  const MAX_RECORDING_TIME = 30000;

  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let audio = null; // TTS audio instance
  let recordingTimerInterval = null;

  // DOM elements for ASR
  const startAsrBlock = document.getElementById('tsr-screen-1');
  const pauseAsrBlock = document.getElementById('pause-asr-block');
  const asrLoaderBlock = document.getElementById('asr-loader');
  const asrResultBlock = document.querySelector('.technology_tsr-result');
  const startButton = document.getElementById('start-asr');
  const stopButton = document.getElementById('stop-asr');
  const transcriptDisplay = document.getElementById('asr-live-transcription');
  const languageDisplay = document.getElementById('asr-language-detected');
  const asrTimerDisplay = document.getElementById('asr-timer');

  // DOM elements for TTS
  const ttsInputButton = document.getElementById("tts-input-button");
  const ttsInputScreen = document.getElementById("tts-screen-1");
  const ttsResultScreen = document.getElementById("integ2-screen2");
  const ttsLoaderBlock = document.getElementById("tts-loader");
  const ttsResultPlayBlock = document.getElementById("tts-result-play");
  const ttsResultPauseBlock = document.getElementById("tts-result-pause");
  const ttsTextField = document.getElementById("tts-input");
  const ttsResultType = document.getElementById("tts-result-type");
  const ttsResultPerson = document.getElementById("tts-result-preson");
  const ttsResultLang = document.getElementById("tts-result-lang");
  const playButton = document.getElementById("play-tts");
  const pauseButton = document.getElementById("pause-tts");
  const ttsLanguageRadios = document.querySelectorAll('input[name="TTS-Language"]');

  // ASR UI state management
  function showInitialState() {
    if (startAsrBlock) startAsrBlock.style.display = 'block';
    if (asrLoaderBlock) asrLoaderBlock.style.display = 'none';
    if (pauseAsrBlock) pauseAsrBlock.style.display = 'none';
    if (asrResultBlock) asrResultBlock.style.display = 'none';
  }

  function showRecordingState() {
    if (startAsrBlock) startAsrBlock.style.display = 'none';
    if (asrLoaderBlock) asrLoaderBlock.style.display = 'none';
    if (pauseAsrBlock) pauseAsrBlock.style.display = 'flex';
    if (asrResultBlock) asrResultBlock.style.display = 'none';
  }

  function showProcessingState() {
    if (startAsrBlock) startAsrBlock.style.display = 'none';
    if (asrLoaderBlock) asrLoaderBlock.style.display = 'flex';
    if (pauseAsrBlock) pauseAsrBlock.style.display = 'none';
    if (asrResultBlock) asrResultBlock.style.display = 'none';
  }

  function showResultState(transcript, language) {
    if (startAsrBlock) startAsrBlock.style.display = 'none';
    if (asrLoaderBlock) asrLoaderBlock.style.display = 'none';
    if (pauseAsrBlock) pauseAsrBlock.style.display = 'none';
    if (asrResultBlock) asrResultBlock.style.display = 'flex';
    if (transcriptDisplay) transcriptDisplay.textContent = transcript;
    if (languageDisplay) languageDisplay.textContent = language;
  }

  showInitialState();

  if (startButton && stopButton && transcriptDisplay) {
    startButton.addEventListener("click", function () {
      if (!isRecording) {
        startRecording();
      }
    });

    stopButton.addEventListener("click", function () {
      if (isRecording) {
        stopRecording();
      }
    });
  }

  // TTS Voice and Language Mapping
  const voiceMapping = {
    "Divya": { voice_name: "hi_female_1", language: "Hindi", model: "mix-IN" },
    "Anu": { voice_name: "hi_female_2", language: "Hindi", model: "mix-IN" },
    "Disha": { voice_name: "hi_female_3", language: "Hindi", model: "mix-IN" },
    "Arjun": { voice_name: "ravan", language: "Hindi", model: "mix-IN" },
    "Claire": { voice_name: "en_female_1", language: "English", model: "mix-IN" },
    "Mark": { voice_name: "en_male_2", language: "English", model: "mix-IN" },
  };

  const languageModels = {
    "Hindi": "mix-IN",
    "English": "mix-IN",
    "Bengali": "mix-IN",
    "Marathi": "mix-IN",
    "Kannada": "mix-IN",
    "Tamil": "mix-IN",
  };

  // TTS UI state management
  function showTtsInputScreen() {
    if (ttsInputScreen) ttsInputScreen.style.display = 'block';
    if (ttsResultScreen) ttsResultScreen.style.display = 'none';
  }

  function showTtsProcessingState() {
    if (ttsInputScreen) ttsInputScreen.style.display = 'none';
    if (ttsResultScreen) ttsResultScreen.style.display = 'grid';
    if (ttsLoaderBlock) ttsLoaderBlock.style.display = 'block';
    if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'none';
    if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
  }

  function showTtsResultState(text, person, language) {
    if (ttsInputScreen) ttsInputScreen.style.display = 'none';
    if (ttsResultScreen) ttsResultScreen.style.display = 'grid';
    if (ttsLoaderBlock) ttsLoaderBlock.style.display = 'none';
    if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'grid';
    if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
    if (ttsResultType) ttsResultType.textContent = text;
    if (ttsResultPerson) ttsResultPerson.textContent = person;
    if (ttsResultLang) ttsResultLang.textContent = language;
  }

  // ===================================================================
  // TTS Logic
  // ===================================================================
  if (ttsInputButton && ttsTextField) {
    ttsInputButton.addEventListener("click", async function (e) {
      e.preventDefault();
      console.log("Button clicked!");

      const text = ttsTextField.value.trim();
      if (!text) {
        console.log("Text field is empty, returning.");
        return;
      }

      const selectedVoiceElement = document.querySelector('input[name="TTS-Voice"]:checked');
      const selectedLanguageElement = document.querySelector('input[name="TTS-Language"]:checked');

      const selectedVoiceName = selectedVoiceElement ? selectedVoiceElement.id : 'Divya';
      const selectedLanguageName = selectedLanguageElement ? selectedLanguageElement.id : 'English';

      const voiceInfo = voiceMapping[selectedVoiceName];
      const apiVoiceName = voiceInfo ? voiceInfo.voice_name : 'hi_female_1';
      const language = voiceInfo ? voiceInfo.language : 'Hindi';

      console.log(`Selected Voice Name: ${selectedVoiceName}`);
      console.log(`API Voice Name: ${apiVoiceName}`);

      showTtsProcessingState();

      try {
        const payload = {
          text: text,
          model: languageModels[selectedLanguageName],
          audio_bytes: null,
          sample_rate: 22050,
          voice_name: apiVoiceName,
          params: {
            stream_chunk_size: 120,
            speed: 1
          }
        };
        console.log("Making API call with payload:", payload);

        const response = await fetch("https://ttsplayground-bk.gnani.site/api/v1/api/file/process", {
          method: "POST",
          headers: {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://gnani-ai.webflow.io",
            "Referer": "https://gnani-ai.webflow.io/",
            "x-request-id": crypto.randomUUID()
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TTS API request failed: ${response.statusText}. Details: ${errorText}`);
        }
        console.log("TTS API Success!");

        const responseText = await response.text();
        const base64Data = responseText.replace(/^"|"$/g, "");
        const binaryString = atob(base64Data);
        const pcmBytes = new Int16Array(binaryString.length / 2);
        for (let i = 0; i < binaryString.length / 2; i++) {
          pcmBytes[i] = (binaryString.charCodeAt(i * 2 + 1) << 8) | binaryString.charCodeAt(i * 2);
        }

        const wavBlob = createWavBlob(pcmBytes, 22050, 1, 16);
        const audioUrl = URL.createObjectURL(wavBlob);

        audio = new Audio(audioUrl);

        audio.onended = function () {
          if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'grid';
          if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
        };

        showTtsResultState(text, selectedVoiceName, language);
      } catch (err) {
        console.error("TTS Error:", err);
        showTtsInputScreen();
        alert("Error generating audio. Please try again.");
      }
    });

    if (playButton) {
      playButton.addEventListener("click", function () {
        if (audio) {
          audio.play().catch(err => {
            console.error("Audio playback error:", err);
          });
          if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'none';
          if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'grid';
        }
      });
    }

    if (pauseButton) {
      pauseButton.addEventListener("click", function () {
        if (audio && !audio.paused) {
          audio.pause();
          if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'grid';
          if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
        }
      });
    }
  }

  // ===================================================================
  // ASR Logic
  // ===================================================================
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
      isRecording = true;
      showRecordingState();

      let timeLeft = MAX_RECORDING_TIME / 1000;
      if (asrTimerDisplay) asrTimerDisplay.textContent = `00:${String(timeLeft).padStart(2, '0')}`;
      recordingTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
          if (asrTimerDisplay) asrTimerDisplay.textContent = `00:${String(timeLeft).padStart(2, '0')}`;
        }
      }, 1000);

      setTimeout(stopRecording, MAX_RECORDING_TIME);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (transcriptDisplay) transcriptDisplay.textContent = "Error: Could not access microphone.";
      showInitialState();
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      const stream = mediaRecorder.stream;

      mediaRecorder.stop();
      isRecording = false;
      clearInterval(recordingTimerInterval);

      showProcessingState();

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudio(recordedBlob);
      };
    }
  }

  async function processAudio(recordedBlob) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const resampledAudioBuffer = await resampleAudio(audioBuffer, 16000);

      const pcm16Data = convertToPCM16(resampledAudioBuffer);

      const wavBlob = createWavBlob(pcm16Data, 16000, 1, 16);

      const formData = new FormData();
      formData.append('audio_file', wavBlob, 'audio.wav');
      formData.append('sampling_rate', '16000');
      formData.append('language_code', 'bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN, mr-IN, or-IN, pa-IN, ta-IN, te-IN');
      formData.append('sender_id', crypto.randomUUID());

      const response = await fetch('https://api.vachana.ai/stt/v3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        showResultState(`Error during transcription: ${response.statusText}. Details: ${errorText}`, "N/A");
        return;
      }

      const result = await response.json();
      if (result.success) {
        const cleanTranscript = result.transcript.replace(/<[^>]+>/g, '').trim();
        const detectedLanguage = result.language_detected || 'Unknown';
        showResultState(cleanTranscript || 'No transcription available', detectedLanguage);
      } else {
        showResultState('Transcription failed', 'N/A');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      showResultState('Error processing audio. Please try again.', 'N/A');
    }
  }

  function convertToPCM16(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const pcmData = new Int16Array(channelData.length);

    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return pcmData;
  }

  function resampleAudio(audioBuffer, targetSampleRate) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const oldSampleRate = audioBuffer.sampleRate;
    const newLength = Math.round(audioBuffer.length * targetSampleRate / oldSampleRate);

    const offlineContext = new OfflineAudioContext(numberOfChannels, newLength, targetSampleRate);
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();

    return offlineContext.startRendering();
  }

  function createWavBlob(pcmBytes, sampleRate = 8000, numChannels = 1, bitsPerSample = 16) {
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataLength = pcmBytes.length;
    const buffer = new ArrayBuffer(44 + dataLength * 2);
    const view = new DataView(buffer);
    let offset = 0;

    function writeString(str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    }

    writeString("RIFF");
    view.setUint32(offset, 36 + dataLength * 2, true); offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;

    writeString("data");
    view.setUint32(offset, dataLength * 2, true); offset += 4;

    const tempPcmUint8View = new Uint8Array(pcmBytes.buffer);
    const wavBytes = new Uint8Array(buffer);
    wavBytes.set(tempPcmUint8View, 44);

    return new Blob([wavBytes], { type: "audio/wav" });
  }


// ==============================
// STS Demo Audio with Seamless Switching (multi-speaker, robust)
// ==============================

const AUDIO_CDN_BASE = 'https://cdn.jsdelivr.net/gh/adarshgowdaa/webflow-cnd-script@f916764dd08da7d3216b9afbef970aac54b974b6/';

// 1) Normalize language key from DOM
function normalizeLanguage(raw) {
  if (!raw) return 'English';
  let s = String(raw).trim();

  // Strip Webflow numeric suffixes (e.g., "Kannada-2" -> "Kannada")
  s = s.replace(/-+\d+$/g, '');

  // Canonical aliases (lowercase keys)
  const aliasMap = {
    english: 'English',
    german: 'German',
    spanish: 'Spanish',
    french: 'French',
    kannada: 'Kannada',
    malayalam: 'Malayalam',
    marathi: 'Marathi',
    hindi: 'Hindi',
    bengali: 'Bengali',
    tamil: 'Tamil',

    // Localized labels from your markup
    'ಕನ್ನಡ': 'Kannada',
    'മലയാളം': 'Malayalam',
    'मराठी': 'Marathi',
    'हिंदी': 'Hindi',
    'বাংলা': 'Bengali',
    'தமிழ்': 'Tamil',
    'français': 'French',
    'deutsch': 'German',
    'español': 'Spanish',
  };

  const lower = s.toLowerCase();
  if (aliasMap[lower]) return aliasMap[lower];
  if (aliasMap[s]) return aliasMap[s];

  // Title-case fallback (kannada -> Kannada)
  s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return aliasMap[s] || s;
}

// 2) Map normalized language to speaker
function speakerForLanguage(langRaw) {
  const L = normalizeLanguage(langRaw);
  if (L === 'German' || L === 'Spanish') return 'Blondie';
  if (L === 'French') return 'Matt';
  if (L === 'Kannada' || L === 'Malayalam' || L === 'Marathi') return 'Raju';
  if (L === 'Hindi' || L === 'Bengali' || L === 'Tamil') return 'Shakuntala';
  return 'Blondie';
}

// 3) Files per speaker (add what you have; English fallback covers gaps)
const stsFilesBySpeaker = {
  Blondie: {
    English: 'English_Blondie.mp3',
    German: 'German_Blondie.mp3',
    Spanish: 'Spanish_Blondie.mp3',
  },
  Matt: {
    English: 'English_Matt.mp3',
    French: 'French_Matt.mp3',
  },
  Raju: {
    English: 'English_Raju.mp3',
    Kannada: 'Kannada_Raju.mp3',
    Malayalam: 'Malayalam_Raju.mp3',
    Marathi: 'Marathi_Raju.mp3',
  },
  Shakuntala: {
    English: 'English_Shakuntala.mp3',
    Hindi: 'Hindi_Shakuntala.mp3',
    Bengali: 'Bengali_Shakuntala.mp3',
    Tamil: 'Tamil_Shakuntala.mp3',
  },
};

// 4) Elements
const stsLanguageRadios = document.querySelectorAll('input[name="STS-Language"]');
const stsToggle = document.getElementById('sts-check');
const stsPlayPauseBtn = document.getElementById('sts-play-pause');
const stsPlayIcon = document.getElementById('sts-play-icon');
const stsPauseIcon = document.getElementById('sts-pause-icon');

// 5) Audio element
let stsAudioEl = new Audio();
stsAudioEl.preload = 'auto';
let isSwitching = false;

// 6) Helpers
function updateStsIcons(isPlaying) {
  if (stsPlayIcon) stsPlayIcon.style.display = isPlaying ? 'none' : 'block';
  if (stsPauseIcon) stsPauseIcon.style.display = isPlaying ? 'block' : 'none';
}

function getSelectedStsLanguage() {
  // Prefer checked radio VALUE (clean), then ID, then title
  const radios = Array.from(document.querySelectorAll('input[name="STS-Language"]'));
  const checked = radios.find(r => r.checked);
  if (checked) return normalizeLanguage(checked.value || checked.id);

  const titleEl = document.getElementById('sts-language-title');
  if (titleEl && titleEl.textContent) return normalizeLanguage(titleEl.textContent);

  return 'English';
}

function resolveStsAudioUrl() {
  const raw = getSelectedStsLanguage();
  const lang = normalizeLanguage(raw);
  const speaker = speakerForLanguage(lang);
  const files = stsFilesBySpeaker[speaker] || {};
  const isWithGnani = !!(stsToggle && stsToggle.checked);

  // Toggle OFF: English_<Speaker>.mp3
  if (!isWithGnani) {
    const eng = files.English
      || (stsFilesBySpeaker[speaker] && stsFilesBySpeaker[speaker].English)
      || 'English_Blondie.mp3';
    return AUDIO_CDN_BASE + eng;
  }

  // Toggle ON: target language file if available, else English_<Speaker>.mp3
  const target = files[lang];
  if (target) return AUDIO_CDN_BASE + target;

  const engFallback = files.English
    || (stsFilesBySpeaker[speaker] && stsFilesBySpeaker[speaker].English)
    || 'English_Blondie.mp3';
  return AUDIO_CDN_BASE + engFallback;
}

async function switchStsSourcePreservePosition(newUrl) {
  if (isSwitching) return;
  isSwitching = true;
  try {
    const wasPlaying = !stsAudioEl.paused && !stsAudioEl.ended;
    const oldTime = stsAudioEl.currentTime || 0;

    if (stsAudioEl.src === newUrl) {
      isSwitching = false;
      return;
    }

    try { stsAudioEl.pause(); } catch (e) {}

    stsAudioEl.src = newUrl;

    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        stsAudioEl.removeEventListener('loadedmetadata', onLoaded);
        stsAudioEl.removeEventListener('error', onError);
        resolve();
      };
      const onError = (e) => {
        stsAudioEl.removeEventListener('loadedmetadata', onLoaded);
        stsAudioEl.removeEventListener('error', onError);
        reject(e);
      };
      stsAudioEl.addEventListener('loadedmetadata', onLoaded, { once: true });
      stsAudioEl.addEventListener('error', onError, { once: true });
      stsAudioEl.load();
    });

    const duration = isFinite(stsAudioEl.duration) ? stsAudioEl.duration : Number.MAX_SAFE_INTEGER;
    const targetTime = Math.min(oldTime, Math.max(0, duration - 0.05));
    if (targetTime > 0) {
      try { stsAudioEl.currentTime = targetTime; } catch (e) {}
    }

    if (wasPlaying) {
      try { await stsAudioEl.play(); updateStsIcons(true); }
      catch (e) { updateStsIcons(false); }
    } else {
      updateStsIcons(false);
    }
  } catch (err) {
    console.warn('STS seamless switch failed:', err);
    updateStsIcons(false);
  } finally {
    isSwitching = false;
  }
}

// 7) Init
(async function initSts() {
  updateStsIcons(false);
  const initialUrl = resolveStsAudioUrl();
  await switchStsSourcePreservePosition(initialUrl);
})();

// 8) Events
if (stsPlayPauseBtn) {
  stsPlayPauseBtn.addEventListener('click', async () => {
    const desiredUrl = resolveStsAudioUrl();
    if (stsAudioEl.src !== desiredUrl) {
      await switchStsSourcePreservePosition(desiredUrl);
      if (stsAudioEl.paused) { try { await stsAudioEl.play(); } catch (e) {} }
      updateStsIcons(!stsAudioEl.paused);
      return;
    }

    if (stsAudioEl.paused) {
      try { await stsAudioEl.play(); updateStsIcons(true); }
      catch (err) { console.warn('STS audio play failed:', err); updateStsIcons(false); }
    } else {
      stsAudioEl.pause();
      updateStsIcons(false);
    }
  });
}

(Array.from(stsLanguageRadios) || []).forEach(r => {
  r.addEventListener('change', async () => {
    const newUrl = resolveStsAudioUrl();
    await switchStsSourcePreservePosition(newUrl);
  });
});

if (stsToggle) {
  stsToggle.addEventListener('change', async () => {
    const newUrl = resolveStsAudioUrl();
    await switchStsSourcePreservePosition(newUrl);
  });
}

stsAudioEl.onended = () => updateStsIcons(false);


});

