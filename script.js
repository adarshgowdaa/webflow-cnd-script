document.addEventListener("DOMContentLoaded", function () {
  const MAX_RECORDING_TIME = 30000;
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let audio = null;
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


  // ASR UI state management functions
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

  // TTS UI state management functions
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
      formData.append('language_code', 'as-IN, bn-BD, bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN, mr-IN, ne-IN, or-IN, pa-IN, ta-IN, te-IN');
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


  // ===================================================================
  // Phone Call Trigger Logic with Rate Limiting
  // ===================================================================
  const callTriggerForm = document.getElementById('wf-form-Home-Hero-Demo');
  const phoneInputField = document.getElementById('hero-form-field');
  const callSubmitButton = document.getElementById('hero-form-button');

  if (callTriggerForm && phoneInputField && callSubmitButton) {
    callTriggerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const phoneNumber = phoneInputField.value.trim();
      if (!/^\d{10}$/.test(phoneNumber)) {
        return;
      }

      const now = Date.now();
      const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
      const MAX_CALLS = 10;
      const rateLimitStorageKey = 'apiCallRateLimit';
      let callData = JSON.parse(localStorage.getItem(rateLimitStorageKey));
      
      const originalButtonTextContainer = callSubmitButton.querySelector('.hover-text:not(.cloned-text)');
      if (!originalButtonTextContainer) {
          return;
      }

      if (callData && (now - callData.timestamp > TEN_MINUTES_IN_MS)) {
        callData = null;
        localStorage.removeItem(rateLimitStorageKey);
      }

      if (!callData) {
        callData = { count: 0, timestamp: 0 };
      }

      if (callData.count >= MAX_CALLS) {
        originalButtonTextContainer.textContent = "Limit Reached";
        callSubmitButton.disabled = true;
        setTimeout(() => {
            callSubmitButton.disabled = false;
        }, TEN_MINUTES_IN_MS);
        return;
      }

      const originalButtonText = originalButtonTextContainer.textContent;
      const waitText = callSubmitButton.getAttribute('data-wait') || "Please wait...";
      originalButtonTextContainer.textContent = waitText;
      callSubmitButton.disabled = true;

      try {
        const response = await fetch('https://api.inya.ai/genbots/website_trigger_call/11b6b4f44d0b4f12ad51dccb500f8aed', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneNumber,
            name: "",
            countryCode: "+91"
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }

        const result = await response.json();
        originalButtonTextContainer.textContent = "Success!";

        if (callData.count === 0) {
            callData.timestamp = Date.now();
        }
        callData.count++;
        localStorage.setItem(rateLimitStorageKey, JSON.stringify(callData));

      } catch (error) {
        originalButtonTextContainer.textContent = "Failed!";

      } finally {
        setTimeout(() => {
            originalButtonTextContainer.textContent = originalButtonText;
            callSubmitButton.disabled = false;
        }, 3000);
      }
    });
  }
});