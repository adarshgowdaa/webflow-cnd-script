document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  // ===================================================================
  // ASR (Automatic Speech Recognition) Logic
  // ===================================================================
  function initAsrLogic() {
    const MAX_RECORDING_TIME = 30000;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingTimerInterval = null;

    const startAsrBlock = document.getElementById('tsr-screen-1');
    const pauseAsrBlock = document.getElementById('pause-asr-block');
    const asrLoaderBlock = document.getElementById('asr-loader');
    const asrResultBlock = document.querySelector('.technology_tsr-result');
    const startButton = document.getElementById('start-asr');
    const stopButton = document.getElementById('stop-asr');
    const transcriptDisplay = document.getElementById('asr-live-transcription');
    const languageDisplay = document.getElementById('asr-language-detected');
    const asrTimerDisplay = document.getElementById('asr-timer');

    function showState(state) {
      const states = {
        initial: { start: 'block', loader: 'none', pause: 'none', result: 'none' },
        recording: { start: 'none', loader: 'none', pause: 'flex', result: 'none' },
        processing: { start: 'none', loader: 'flex', pause: 'none', result: 'none' },
        result: { start: 'none', loader: 'none', pause: 'none', result: 'flex' }
      };
      const S = states[state] || states.initial;
      if (startAsrBlock) startAsrBlock.style.display = S.start;
      if (asrLoaderBlock) asrLoaderBlock.style.display = S.loader;
      if (pauseAsrBlock) pauseAsrBlock.style.display = S.pause;
      if (asrResultBlock) asrResultBlock.style.display = S.result;
    }

    function showResult(transcript, language) {
      showState('result');
      if (transcriptDisplay) transcriptDisplay.textContent = transcript;
      if (languageDisplay) languageDisplay.textContent = language;
    }

    async function processAudio(recordedBlob) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await recordedBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const resampledAudioBuffer = await resampleAudio(audioBuffer, 16000);
            const pcm16Data = convertToPCM16(resampledAudioBuffer);
            const wavBlob = createWavBlob(pcm16Data, 16000);
            
            const formData = new FormData();
            formData.append('audio_file', wavBlob, 'audio.wav');
            formData.append('sampling_rate', '16000');
            formData.append('language_code', 'bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN, mr-IN, or-IN, pa-IN, ta-IN, te-IN');
            formData.append('sender_id', crypto.randomUUID());

            const response = await fetch('https://api.vachana.ai/stt/v3', { method: 'POST', body: formData });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
            const result = await response.json();
            if (result.success) {
                const cleanTranscript = result.transcript.replace(/<[^>]+>/g, '').trim();
                showResult(cleanTranscript || 'No transcription available', result.language_detected || 'Unknown');
            } else {
                showResult('Transcription failed', 'N/A');
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            showResult('Error processing audio. Please try again.', 'N/A');
        }
    }

    function stopRecording() {
      if (!mediaRecorder || !isRecording) return;
      mediaRecorder.stop();
    }

    async function startRecording() {
      if (isRecording) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (event) => event.data.size > 0 && audioChunks.push(event.data);
        
        mediaRecorder.onstop = () => {
          isRecording = false;
          clearInterval(recordingTimerInterval);
          stream.getTracks().forEach(track => track.stop());
          showState('processing');
          const recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
          processAudio(recordedBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        showState('recording');

        let timeLeft = MAX_RECORDING_TIME / 1000;
        if (asrTimerDisplay) asrTimerDisplay.textContent = `00:${String(timeLeft).padStart(2, '0')}`;
        recordingTimerInterval = setInterval(() => {
            timeLeft--;
            if (asrTimerDisplay) asrTimerDisplay.textContent = `00:${String(Math.max(0, timeLeft)).padStart(2, '0')}`;
        }, 1000);

        setTimeout(stopRecording, MAX_RECORDING_TIME);
      } catch (error) {
        console.error("Error starting recording:", error);
        showResult("Error: Could not access microphone.", "N/A");
      }
    }
    
    if (startButton) startButton.addEventListener("click", startRecording);
    if (stopButton) stopButton.addEventListener("click", stopRecording);

    if(startAsrBlock) showState('initial');
  }


  // ===================================================================
  // TTS (Text-to-Speech) Logic
  // ===================================================================
  function initTtsLogic() {
    const ttsInputButton = document.getElementById("tts-input-button");
    if (!ttsInputButton) return;
    
    let audio = null;
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

    const voiceMapping = {
        "Divya": { voice_name: "hi_female_1", language: "Hindi", model: "mix-IN" }, "Anu": { voice_name: "hi_female_2", language: "Hindi", model: "mix-IN" },
        "Disha": { voice_name: "hi_female_3", language: "Hindi", model: "mix-IN" }, "Arjun": { voice_name: "ravan", language: "Hindi", model: "mix-IN" },
        "Claire": { voice_name: "en_female_1", language: "English", model: "mix-IN" }, "Mark": { voice_name: "en_male_2", language: "English", model: "mix-IN" },
    };
    const languageModels = { "Hindi": "mix-IN", "English": "mix-IN", "Bengali": "mix-IN", "Marathi": "mix-IN", "Kannada": "mix-IN", "Tamil": "mix-IN" };

    function showState(state, data = {}) {
        const isResult = state === 'result';
        if (ttsInputScreen) ttsInputScreen.style.display = state === 'input' ? 'block' : 'none';
        if (ttsResultScreen) ttsResultScreen.style.display = state !== 'input' ? 'flex' : 'none';
        if (ttsLoaderBlock) ttsLoaderBlock.style.display = state === 'processing' ? 'block' : 'none';
        if (ttsResultPlayBlock) ttsResultPlayBlock.style.display = isResult ? 'flex' : 'none';
        if (ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';

        if (isResult) {
            if (ttsResultType) ttsResultType.textContent = data.text;
            if (ttsResultPerson) ttsResultPerson.textContent = data.person;
            if (ttsResultLang) ttsResultLang.textContent = data.language;
        }
    }

    ttsInputButton.addEventListener("click", async (e) => {
        e.preventDefault();
        const text = ttsTextField.value.trim();
        if (!text) return;

        const selectedVoiceName = document.querySelector('input[name="TTS-Voice"]:checked')?.id || 'Divya';
        const selectedLanguageName = document.querySelector('input[name="TTS-Language"]:checked')?.id || 'English';
        const voiceInfo = voiceMapping[selectedVoiceName] || voiceMapping.Divya;

        showState('processing');

        try {
            const payload = { text, model: languageModels[selectedLanguageName], audio_bytes: null, sample_rate: 22050, voice_name: voiceInfo.voice_name, params: { stream_chunk_size: 120, speed: 1 }};
            const response = await fetch("https://ttsplayground-bk.gnani.site/api/v1/api/file/process", {
                method: "POST", headers: { "Content-Type": "application/json", "x-request-id": crypto.randomUUID() }, body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`TTS API request failed: ${response.statusText}`);
            
            const base64Data = (await response.text()).replace(/^"|"$/g, "");
            const binaryString = atob(base64Data);
            const pcmBytes = new Int16Array(binaryString.length / 2);
            for (let i = 0; i < pcmBytes.length; i++) {
                pcmBytes[i] = (binaryString.charCodeAt(i * 2 + 1) << 8) | binaryString.charCodeAt(i * 2);
            }
            const wavBlob = createWavBlob(pcmBytes, 22050);
            audio = new Audio(URL.createObjectURL(wavBlob));
            audio.onended = () => {
                if(ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'flex';
                if(ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
            };
            showState('result', { text, person: selectedVoiceName, language: voiceInfo.language });
        } catch (err) {
            console.error("TTS Error:", err);
            showState('input');
            alert("Error generating audio. Please try again.");
        }
    });

    if (playButton) playButton.addEventListener("click", () => {
        if (!audio) return;
        audio.play().catch(err => console.error("Audio playback error:", err));
        if(ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'none';
        if(ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'flex';
    });

    if (pauseButton) pauseButton.addEventListener("click", () => {
        if (audio && !audio.paused) {
          audio.pause();
          if(ttsResultPlayBlock) ttsResultPlayBlock.style.display = 'flex';
          if(ttsResultPauseBlock) ttsResultPauseBlock.style.display = 'none';
        }
    });
  }

  // ===================================================================
  // Phone Call Trigger Logic
  // ===================================================================
  function initPhoneCallTrigger() {
    const callTriggerForm = document.getElementById('wf-form-Home-Hero-Demo');
    if (!callTriggerForm) return;

    const phoneInputField = document.getElementById('hero-form-field');
    const callSubmitButton = document.getElementById('hero-form-button');
    
    callTriggerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Prevent multiple submissions while one is in progress
        if (callSubmitButton.classList.contains('is-loading')) return;

        const phoneNumber = phoneInputField.value.trim();
        if (!/^\d{10}$/.test(phoneNumber)) return;

        const selectedCountryRadio = document.querySelector('input[name="Country-Code-Home"]:checked');
        const selectedCountryValue = selectedCountryRadio ? selectedCountryRadio.value : 'India';
        const countryCodePayload = (selectedCountryValue === 'United States') ? '0' : '+91';

        const rateLimitStorageKey = 'apiCallRateLimit';
        const MAX_CALLS = 10;
        const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
        let callData = JSON.parse(localStorage.getItem(rateLimitStorageKey)) || { count: 0, timestamp: 0 };
        
        if (Date.now() - callData.timestamp > TEN_MINUTES_IN_MS) {
            localStorage.removeItem(rateLimitStorageKey);
            callData = { count: 0, timestamp: 0 };
        }

        if (callData.count >= MAX_CALLS) {
            console.warn("Rate limit reached.");
            return;
        }

        callSubmitButton.disabled = true;
        callSubmitButton.classList.add('is-loading'); // Add loading class

        try {
            const response = await fetch('https://api.inya.ai/genbots/website_trigger_call/11b6b4f44d0b4f12ad51dccb500f8aed', {
                method: 'POST', headers: { 'accept': 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify({ phone: phoneNumber, name: "", countryCode: countryCodePayload })
            });
            if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
            
            callSubmitButton.classList.add('is-success');
            if (callData.count === 0) callData.timestamp = Date.now();
            callData.count++;
            localStorage.setItem(rateLimitStorageKey, JSON.stringify(callData));
        } catch (error) {
            console.error("Phone call trigger error:", error);
            callSubmitButton.classList.add('is-failure');
        } finally {
            callSubmitButton.classList.remove('is-loading');
            
            setTimeout(() => {
                callSubmitButton.classList.remove('is-success', 'is-failure');
                callSubmitButton.disabled = false;
            }, 3000);
        }
    });
}

  // ===================================================================
  // Reusable Audio Player Logic
  // ===================================================================
  function initAllAudioPlayers() {
      const AUDIO_CDN_BASE = 'https://cdn.jsdelivr.net/gh/adarshgowdaa/website-audio@dae636ff0f7e0fbeaa808cf51eb08f19c952ee47/';
      const allAudioPlayers = [];

      function createSwitchablePlayer(config) {
        const { controlRadiosQuery, toggleId, playPauseBtnId, playIconId, pauseIconId, sliderId, otherLangLabelId, fileMap, resolveUrlFn } = config;
        const playPauseBtn = document.getElementById(playPauseBtnId);
        if (!playPauseBtn) return;
        
        const controlRadios = document.querySelectorAll(controlRadiosQuery);
        const toggle = document.getElementById(toggleId);
        const playIcon = document.getElementById(playIconId);
        const pauseIcon = document.getElementById(pauseIconId);
        const slider = document.getElementById(sliderId);
        const otherLangLabel = document.getElementById(otherLangLabelId);

        const audioEl = new Audio();
        audioEl.preload = 'auto';
        allAudioPlayers.push(audioEl);
        let isSwitching = false;
        
        const updateIcons = (isPlaying) => {
            if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
            if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
        };
        const updateToggleLabel = () => {
          if (!otherLangLabel) return;
          const selectedRadio = document.querySelector(`${controlRadiosQuery}:checked`);
          if (selectedRadio) {
              const labelSpan = selectedRadio.parentElement.querySelector('.technology_form-select-link-label');
              if (labelSpan) otherLangLabel.textContent = labelSpan.textContent;
          }
        };
        const resolveAudioUrl = () => AUDIO_CDN_BASE + resolveUrlFn(fileMap);
        async function switchSource(newUrl) {
            if (isSwitching) return;
            isSwitching = true;
            try {
                const wasPlaying = !audioEl.paused && !audioEl.ended;
                const oldTime = audioEl.currentTime || 0;
                if (audioEl.src.endsWith(newUrl)) return;
                audioEl.pause();
                audioEl.src = newUrl;
                await new Promise((resolve, reject) => {
                    audioEl.addEventListener('loadedmetadata', resolve, { once: true });
                    audioEl.addEventListener('error', reject, { once: true });
                });
                const duration = isFinite(audioEl.duration) ? audioEl.duration : Infinity;
                audioEl.currentTime = Math.min(oldTime, Math.max(0, duration - 0.05));
                if (wasPlaying) await audioEl.play();
            } catch (err) {
                console.warn(`Seamless switch failed for ${playPauseBtnId}:`, err);
            } finally {
                updateIcons(!audioEl.paused);
                isSwitching = false;
            }
        }
        
        playPauseBtn.addEventListener('click', async () => {
          const desiredUrl = resolveAudioUrl();
          if (!audioEl.src.endsWith(desiredUrl)) {
              await switchSource(desiredUrl);
              if (audioEl.paused) await audioEl.play().catch(e=>console.error(e));
          } else {
              audioEl.paused ? await audioEl.play().catch(e=>console.error(e)) : audioEl.pause();
          }
        });
        
        const onControlChange = () => { if(otherLangLabelId) updateToggleLabel(); switchSource(resolveAudioUrl()); };
        controlRadios.forEach(r => r.addEventListener('change', onControlChange));
        if (toggle) toggle.addEventListener('change', onControlChange);
        
        audioEl.addEventListener('timeupdate', () => slider && isFinite(audioEl.duration) && (slider.value = (audioEl.currentTime / audioEl.duration) * 100));
        if (slider) slider.addEventListener('input', () => isFinite(audioEl.duration) && (audioEl.currentTime = (slider.value / 100) * audioEl.duration));
        
        audioEl.onplay = () => {
            allAudioPlayers.forEach(p => p !== audioEl && !p.paused && p.pause());
            updateIcons(true);
        };
        audioEl.onpause = () => updateIcons(false);
        audioEl.onended = () => { updateIcons(false); if (slider) slider.value = 0; };
        
        if(otherLangLabelId) updateToggleLabel();
        updateIcons(false);
        switchSource(resolveAudioUrl());
      }
      
      function createSimplePlayer(config) {
        const { playPauseBtnId, playIconId, pauseIconId, sliderId, audioUrl } = config;
        const playPauseBtn = document.getElementById(playPauseBtnId);
        if (!playPauseBtn) return null;

        const playIcon = document.getElementById(playIconId);
        const pauseIcon = document.getElementById(pauseIconId);
        const slider = document.getElementById(sliderId);
        const audioEl = new Audio(audioUrl);
        audioEl.preload = 'auto';
        allAudioPlayers.push(audioEl);
        
        const updateIcons = (isPlaying) => {
            if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
            if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
        };

        playPauseBtn.addEventListener('click', () => audioEl.paused ? audioEl.play() : audioEl.pause());
        
        audioEl.onplay = () => {
            allAudioPlayers.forEach(p => p !== audioEl && !p.paused && p.pause());
            updateIcons(true);
        };
        audioEl.onpause = () => updateIcons(false);
        audioEl.onended = () => { updateIcons(false); if (slider) slider.value = 0; };
        
        audioEl.addEventListener('timeupdate', () => slider && isFinite(audioEl.duration) && (slider.value = (audioEl.currentTime / audioEl.duration) * 100));
        if (slider) slider.addEventListener('input', () => isFinite(audioEl.duration) && (audioEl.currentTime = (slider.value / 100) * audioEl.duration));
        
        updateIcons(false);
        if (slider) slider.value = 0;
        return audioEl;
      }
      
      // --- STS Player Config ---
      const stsFilesBySpeaker = {
          Blondie: { English: 'English_Blondie.mp3', German: 'German_Blondie.mp3', Spanish: 'Spanish_Blondie.mp3' },
          Matt: { English: 'English_Matt.mp3', French: 'French_Matt.mp3' },
          Raju: { English: 'English_Raju.mp3', Kannada: 'Kannada_Raju.mp3', Malayalam: 'Malayalam_Raju.mp3', Marathi: 'Marathi_Raju.mp3' },
          Shakuntala: { English: 'English_Shakuntala.mp3', Hindi: 'Hindi_Shakuntala.mp3', Bengali: 'Bengali_Shakuntala.mp3', Tamil: 'Tamil_shakuntala.mp3' },
      };
      createSwitchablePlayer({
          controlRadiosQuery: 'input[name="STS-Language"]', toggleId: 'sts-check', playPauseBtnId: 'sts-play-pause', playIconId: 'sts-play-icon',
          pauseIconId: 'sts-pause-icon', sliderId: 'sts-slider', otherLangLabelId: 'sts-other-lang', fileMap: stsFilesBySpeaker,
          resolveUrlFn: (fileMap) => {
              const langRaw = document.querySelector('input[name="STS-Language"]:checked')?.value || 'French';
              const speakerMap = { German: 'Blondie', Spanish: 'Blondie', French: 'Matt', Kannada: 'Raju', Malayalam: 'Raju', Marathi: 'Raju', Hindi: 'Shakuntala', Bengali: 'Shakuntala', Tamil: 'Shakuntala' };
              const speaker = speakerMap[langRaw] || 'Blondie';
              const files = fileMap[speaker] || {};
              const isToggled = document.getElementById('sts-check')?.checked;
              return isToggled ? (files[langRaw] || files.English) : files.English;
          }
      });

      // --- Noise Cancellation Player Config ---
      const noiseFiles = {
          'Office': { original: 'Office.mp3', neutralized: 'Office_Neutralized.mp3' },
          'Call Centre': { original: 'Call_Center.mp3', neutralized: 'Call_Center_Neutralized.mp3' },
          'Traffic': { original: 'Traffic.mp3', neutralized: 'Traffic_Neutralized.mp3' }
      };
      createSwitchablePlayer({
          controlRadiosQuery: 'input[name="Noise-Environment"]', toggleId: 'noise-check', playPauseBtnId: 'noise-play-pause', playIconId: 'noise-play-icon',
          pauseIconId: 'noise-pause-icon', sliderId: 'noise-slider', fileMap: noiseFiles,
          resolveUrlFn: (fileMap) => {
              const environment = document.querySelector('input[name="Noise-Environment"]:checked')?.value || 'Office';
              const isNeutralized = document.getElementById('noise-check')?.checked;
              const fileSet = fileMap[environment] || fileMap['Office'];
              return isNeutralized ? fileSet.neutralized : fileSet.original;
          }
      });

      // --- Accent Change Player Config ---
      const accentFiles = {
          'Sample 1': { original: 'Indian_Accent_matt.mp3', transformed: 'American English_matt.mp3' },
          'Sample 2': { original: 'Indian_english_chris.mp3', transformed: 'Australian english_chris.mp3' },
          'Sample 3': { original: 'Indian_English_james.mp3', transformed: 'British English_James.mp3' }
      };
      createSwitchablePlayer({
          controlRadiosQuery: 'input[name="Accent-Transformation"]', toggleId: 'accent-check', playPauseBtnId: 'accent-play-pause', playIconId: 'accent-play-icon',
          pauseIconId: 'accent-pause-icon', sliderId: 'accent-slider', fileMap: accentFiles,
          resolveUrlFn: (fileMap) => {
              const sample = document.querySelector('input[name="Accent-Transformation"]:checked')?.value || 'Sample 1';
              const isTransformed = document.getElementById('accent-check')?.checked;
              const fileSet = fileMap[sample] || fileMap['Sample 1'];
              return isTransformed ? fileSet.transformed : fileSet.original;
          }
      });

      // --- Barge-in Players Config ---
      createSimplePlayer({ playPauseBtnId: 'barge-play-pause', playIconId: 'barge-play-icon', pauseIconId: 'barge-pause-icon', sliderId: 'barge-slider', audioUrl: AUDIO_CDN_BASE + 'With _barge.mp3' });
      createSimplePlayer({ playPauseBtnId: 'nobarge-play-pause', playIconId: 'nobarge-play-icon', pauseIconId: 'nobarge-pause-icon', sliderId: 'nobarge-slider', audioUrl: AUDIO_CDN_BASE + 'Without_barge.mp3' });
  }

  // ===================================================================
  // Global Utility Functions
  // ===================================================================
  function createWavBlob(pcmBytes, sampleRate = 16000) {
      const numChannels = 1, bitsPerSample = 16;
      const blockAlign = numChannels * bitsPerSample / 8;
      const byteRate = sampleRate * blockAlign;
      const dataLength = pcmBytes.length * pcmBytes.BYTES_PER_ELEMENT;
      const buffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(buffer);
      
      const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

      writeString(0, "RIFF"); view.setUint32(4, 36 + dataLength, true); writeString(8, "WAVE"); writeString(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true);
      writeString(36, "data"); view.setUint32(40, dataLength, true);

      new Int16Array(buffer, 44).set(pcmBytes);
      return new Blob([buffer], { type: "audio/wav" });
  }
  function convertToPCM16(audioBuffer) {
      const data = audioBuffer.getChannelData(0);
      const pcm = new Int16Array(data.length);
      for (let i = 0; i < data.length; i++) {
          pcm[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
      }
      return pcm;
  }
  function resampleAudio(audioBuffer, targetSampleRate) {
      return new Promise(resolve => {
        const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start();
        offlineContext.startRendering().then(resolve);
      });
  }


  // ===================================================================
  // Initialize All Features
  // ===================================================================
  initAsrLogic();
  initTtsLogic();
  initPhoneCallTrigger();
  initAllAudioPlayers();

});