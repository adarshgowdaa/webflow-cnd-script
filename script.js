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
  const form = document.getElementById("email-form");
  const textField = document.getElementById("tts-input");
  const field2 = document.getElementById("field-2");
  const playDiv = document.getElementById("integ2-state2");
  const pauseDiv = document.getElementById("integ2-state3");
  const playButton = document.getElementById("play-tts");
  const pauseButton = document.getElementById("pause-tts");

  // UI state management functions
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

  if (form && textField && field2 && playDiv && pauseDiv && playButton && pauseButton) {
      // TTS Form Submission
      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const text = textField.value.trim();
        if (!text) {
          return;
        }

        field2.value = text;

        try {
          const payload = {
            text: text,
            model: "mix-IN",
            audio_bytes: null,
            sample_rate: 24000,
            voice_name: "hi_female_1",
            params: {
              stream_chunk_size: 20,
              speed: 1
            }
          };

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

          const responseText = await response.text();
          const base64Data = responseText.replace(/^"|"$/g, "");
          const binaryString = atob(base64Data);
          const pcmBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            pcmBytes[i] = binaryString.charCodeAt(i);
          }

          const wavBlob = createWavBlob(pcmBytes, 24000, 1, 16);
          const audioUrl = URL.createObjectURL(wavBlob);

          audio = new Audio(audioUrl);

          audio.onended = function () {
            playDiv.style.display = 'block';
            pauseDiv.style.display = 'none';
          };
        } catch (err) {
        }
      });

      // Play and Pause Controls for TTS
      playButton.addEventListener("click", function () {
        if (audio) {
          audio.play().catch(err => {
          });
          playDiv.style.display = 'none';
          pauseDiv.style.display = 'block';
        }
      });

      pauseButton.addEventListener("click", function () {
        if (audio && !audio.paused) {
          audio.pause();
          playDiv.style.display = 'block';
          pauseDiv.style.display = 'none';
        }
      });
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


  function createWavBlob(pcmBytes, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataLength = pcmBytes.length * 2; // 16-bit PCM is 2 bytes per sample
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    let offset = 0;

    function writeString(str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    }

    writeString("RIFF");
    view.setUint32(offset, 36 + dataLength, true); offset += 4;
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
    view.setUint32(offset, dataLength, true); offset += 4;

    const wavBytes = new Uint8Array(buffer);
    const pcmUint8View = new Uint8Array(pcmBytes.buffer);
    wavBytes.set(pcmUint8View, 44);

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