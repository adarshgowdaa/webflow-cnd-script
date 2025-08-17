document.addEventListener("DOMContentLoaded", function () {
  // ===================================================================
  // Existing ASR (Speech-to-Text) and TTS (Text-to-Speech) Code
  // ===================================================================
  const MAX_RECORDING_TIME = 30000; // 30 seconds
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let audio = null;

  // DOM elements for ASR
  const startButton = document.getElementById('start-asr');
  const stopButton = document.getElementById('stop-asr');
  const transcriptDisplay = document.getElementById('live-transcription');

  // DOM elements for TTS
  const form = document.getElementById("email-form");
  const textField = document.getElementById("tts-input");
  const field2 = document.getElementById("field-2");
  const playDiv = document.getElementById("integ2-state2");
  const pauseDiv = document.getElementById("integ2-state3");
  const playButton = document.getElementById("play-tts");
  const pauseButton = document.getElementById("pause-tts");

  // Check for ASR/TTS elements before adding listeners
  if (startButton && stopButton && transcriptDisplay) {
    // Start Recording
    startButton.addEventListener("click", function () {
      if (!isRecording) {
        startRecording();
      }
    });

    // Stop Recording
    stopButton.addEventListener("click", function () {
      if (isRecording) {
        stopRecording();
      }
    });
  }

  // Check for TTS form elements before adding listeners
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
          // Errors are now handled silently on the frontend
        }
      });

      // Play and Pause Controls for TTS
      playButton.addEventListener("click", function () {
        if (audio) {
          audio.play().catch(err => {
            // Errors are now handled silently on the frontend
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
      transcriptDisplay.textContent = "Recording...";

      setTimeout(stopRecording, MAX_RECORDING_TIME);
    } catch (error) {
      // Errors are now handled silently on the frontend
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };
    }
  }

  async function processAudio(audioBlob) {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const pcmData = convertToPCM16(audioBuffer);

      const response = await fetch('https://vachana.gnani.site/stt/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'sampling-rate': '48000',
          'lang': 'en-IN',
          'model': 'ML'
        },
        body: pcmData,
      });

      if (!response.ok) {
        transcriptDisplay.textContent = "Error during transcription.";
        return;
      }

      const result = await response.json();
      if (result.success) {
        const cleanTranscript = result.transcript.replace(/<[^>]+>/g, '').trim();
        transcriptDisplay.textContent = cleanTranscript || 'No transcription available';
      } else {
        transcriptDisplay.textContent = 'Transcription failed';
      }
    } catch (error) {
      transcriptDisplay.textContent = 'Error processing audio. Please try again.';
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

  function createWavBlob(pcmBytes, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataLength = pcmBytes.length;
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
    wavBytes.set(pcmBytes, 44);

    return new Blob([wavBytes], { type: "audio/wav" });
  }


  // ===================================================================
  // NEW CODE: Phone Call Trigger Logic with Rate Limiting
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

      // --- Rate Limiting Logic ---
      const now = Date.now();
      const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
      const MAX_CALLS = 10;
      const rateLimitStorageKey = 'apiCallRateLimit';
      let callData = JSON.parse(localStorage.getItem(rateLimitStorageKey));
      
      const originalButtonTextContainer = callSubmitButton.querySelector('.hover-text:not(.cloned-text)');
      if (!originalButtonTextContainer) {
          return;
      }

      // Reset the counter if the 10-minute window has expired
      if (callData && (now - callData.timestamp > TEN_MINUTES_IN_MS)) {
        callData = null;
        localStorage.removeItem(rateLimitStorageKey);
      }

      // Initialize if it's the first time or after a reset
      if (!callData) {
        // Initialize with a placeholder timestamp. It will be set on the first successful call.
        callData = { count: 0, timestamp: 0 };
      }

      // Check if the user has exceeded the call limit
      if (callData.count >= MAX_CALLS) {
        originalButtonTextContainer.textContent = "Limit Reached";
        callSubmitButton.disabled = true;
        // Re-enable after a delay to allow another try later without a page refresh
        setTimeout(() => {
            callSubmitButton.disabled = false;
        }, TEN_MINUTES_IN_MS);
        return; // Stop execution
      }
      // --- End of Rate Limiting Logic ---

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

        // On success, update the counter and timestamp in localStorage
        // If it's the first successful call, set the timestamp to start the 10-minute window
        if (callData.count === 0) {
            callData.timestamp = Date.now();
        }
        callData.count++; // Increment the counter
        localStorage.setItem(rateLimitStorageKey, JSON.stringify(callData));

      } catch (error) {
        originalButtonTextContainer.textContent = "Failed!";

      } finally {
        setTimeout(() => {
            originalButtonTextContainer.textContent = originalButtonText;
            callSubmitButton.disabled = false;
        }, 3000); // Reset after 3 seconds
      }
    });
  }
});
