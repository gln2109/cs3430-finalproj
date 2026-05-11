// cs3430-finalproj
// gln2109

let audioCtx;
let globalGain;
let timer;
let playing = false;
let WHITE_NOISE;
const S_GAIN = 0.0001

const INPUT_MAP = {
    "k": () => kick(),
    "s": () => snare(),
    "h": () => hat()
}
const REST_KEY = "x"

let kick_tuning = {"name": "kick", "volume": 0.8, "attack": 0.01, "decay": 0.2,
    "start_freq": 150, "end_freq": 40};

let snare_tuning = {"name": "snare", "volume": 0.5, "attack": 0.02, "decay": 0.35,
    "hp_filter_freq": 4000, "osc_freq": 150, "osc_gain_ratio": 0.6, "osc_decay_ratio": 0.5};

let hat_tuning = {"name": "hat", "volume": 0.8, "attack": 0.02, "decay": 0.15,
    "bp_filter_freq": 9000, "bp_filter_q": 3};

const drum_tunings = [kick_tuning, snare_tuning, hat_tuning];
const slider_scales = {"volume": 0.1, "attack": 0.01, "decay": 0.05, "start_freq": 10, "end_freq": 10,
    "hp_filter_freq": 500, "osc_freq": 10, "osc_gain_ratio": 0.1, "osc_decay_ratio": 0.1,
    "bp_filter_freq": 500, "bp_filter_q": 0.25};

document.addEventListener("DOMContentLoaded", function(event) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    globalGain = audioCtx.createGain();
    globalGain.connect(audioCtx.destination);

    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const display = slider.previousElementSibling;
        const scale = parseFloat(display.dataset.scale);
        function updateValue() {
            display.textContent = (slider.value * scale).toFixed(2) + " " + display.dataset.unit;
            updateTuning();
        }
        slider.addEventListener('input', updateValue);
    });

    loadDefaultTuning();
    WHITE_NOISE = whiteNoiseBuffer();
})

function parseSequence(unparsed) {
    let sp = unparsed.split(" ");
    let parsed = []
    sp.forEach((item, index) => {
        parsed.push(item.split(""));
    });
    return parsed;
}

function playSequence() {
    stopSequence();
    playing = true;
    const sequence = parseSequence(document.getElementById("sequenceInput").value);
    const bpm = Number(document.getElementById("bpmInput").value);
    startLoop(sequence, bpm);
}

function stopSequence() {
    playing = false;
    clearTimeout(timer);
}

function startLoop(sequence, bpm) {
    let tickRate = 30 / bpm
    let i = 0;
    function mainLoop() {
        if (playing) {
            const time = audioCtx.currentTime;
            const keys = sequence[i % sequence.length];
            keys.forEach(key => {
                if (key !== REST_KEY) {
                    INPUT_MAP[key]?.(time);
                }
            });
            i++;
            timer = setTimeout(mainLoop, tickRate*1000);
        }
    }
    mainLoop();
}

function kick(time = audioCtx.currentTime) {
    let volume = kick_tuning["volume"];
    let attack = kick_tuning["attack"];
    let decay = kick_tuning["decay"];
    let osc_start_freq = kick_tuning["start_freq"];
    let osc_end_freq = kick_tuning["end_freq"];

    const osc = audioCtx.createOscillator();
    osc.frequency.value = osc_start_freq;
    osc.frequency.exponentialRampToValueAtTime(osc_end_freq, time + decay);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(S_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack)
    gain.gain.setValueAtTime(volume, time + attack)
    gain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    osc.connect(gain).connect(globalGain);

    osc.start();
    osc.stop(time + decay);
}

function snare(time = audioCtx.currentTime) {
    let volume = snare_tuning["volume"];
    let attack = snare_tuning["attack"];
    let decay = snare_tuning["decay"];
    let filter_freq = snare_tuning["hp_filter_freq"];
    let osc_gain_ratio = snare_tuning["osc_gain_ratio"];
    let osc_decay_ratio = snare_tuning["osc_decay_ratio"];
    let osc_freq = snare_tuning["osc_freq"];

    let noise = audioCtx.createBufferSource();
    noise.buffer = WHITE_NOISE;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(S_GAIN, time);
    noiseGain.gain.exponentialRampToValueAtTime(volume, time + attack)
    noiseGain.gain.setValueAtTime(volume, time + attack)
    noiseGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    let osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(osc_freq, time);

    let oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(S_GAIN, time);
    oscGain.gain.exponentialRampToValueAtTime(volume * osc_gain_ratio, time + attack)
    oscGain.gain.setValueAtTime(volume * osc_gain_ratio, time + attack)
    oscGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay * osc_decay_ratio);

    const hpFilter = audioCtx.createBiquadFilter();
    hpFilter.type = "highpass";
    hpFilter.frequency.value = filter_freq;

    noise.connect(hpFilter).connect(noiseGain).connect(globalGain);
    osc.connect(oscGain).connect(globalGain);

    noise.start(time);
    noise.stop(time + decay);
    osc.start(time);
    osc.stop(time + decay);
}

function hat(time = audioCtx.currentTime) {
    let volume = hat_tuning["volume"];
    let attack = hat_tuning["attack"];
    let decay = hat_tuning["decay"];
    let filter_freq = hat_tuning["bp_filter_freq"];
    let filter_q = hat_tuning["bp_filter_q"];

    let noise = audioCtx.createBufferSource();
    noise.buffer = WHITE_NOISE;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(S_GAIN, time);
    noiseGain.gain.exponentialRampToValueAtTime(volume, time + attack)
    noiseGain.gain.setValueAtTime(volume, time + attack)
    noiseGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    const bpFilter = audioCtx.createBiquadFilter();
    bpFilter.type = "bandpass";
    bpFilter.frequency.value = filter_freq;
    bpFilter.Q.value = filter_q;

    noise.connect(bpFilter).connect(noiseGain).connect(globalGain);
    noise.start(time);
    noise.stop(time + decay);
}

function loadDefaultTuning() {
    drum_tunings.forEach(tuning => {
        Object.keys(tuning).forEach(key => {
            if(key !== "name") {
                const slider = document.getElementById(`${tuning["name"]}_${key}`);
                const display = slider.previousElementSibling;
                slider.value = (tuning[key] / slider_scales[key]);
                display.textContent = (slider.value * slider_scales[key]).toFixed(2) + " " + display.dataset.unit;
            }
        });
    });
}

function updateTuning() {
    drum_tunings.forEach(tuning => {
        Object.keys(tuning).forEach(key => {
            if(key !== "name") {
                tuning[key] = document.getElementById(`${tuning["name"]}_${key}`).value * slider_scales[key]
            }
        });
    })
    globalGain.gain.setValueAtTime(document.getElementById("masterVolume").value * slider_scales["volume"],
        audioCtx.currentTime);
}

function whiteNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate,
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
    output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}
