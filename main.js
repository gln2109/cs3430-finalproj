// cs3430-finalproj
// gln2109

let audioCtx;
let globalGain;
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
        updateValue();
    });

    WHITE_NOISE = whiteNoiseBuffer();
})

const INPUT_MAP = {
    "k": () => kick(),
    "s": () => snare(),
    "h": () => hat(),
    "c": () => clap()
}
const REST_KEY = "x"
const S_GAIN = 0.0001
let timer;
let playing = false;
let WHITE_NOISE;

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
            const keys = sequence[i % sequence.length]
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
    let osc_start_freq = 150;
    let osc_end_freq = 40;

    const osc = audioCtx.createOscillator();
    osc.frequency.value = osc_start_freq;
    osc.frequency.exponentialRampToValueAtTime(osc_end_freq, time + decay);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(S_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack)
    gain.gain.setValueAtTime(volume, time + attack)
    gain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    //WIP
    const noise = audioCtx.createBufferSource();
    noise.buffer = WHITE_NOISE;
    const noiseFilter = audioCtx.createBiquadFilter()
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 3000;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.15, time);
    noiseGain.gain.exponentialRampToValueAtTime(S_GAIN, time + 0.01);
    noise.connect(noiseFilter).connect(noiseGain).connect(globalGain);
    noise.start(time);
    noise.stop(time+0.01);
    //WIP


    osc.connect(gain).connect(globalGain);

    osc.start();
    osc.stop(time + decay);
}


function snare(time = audioCtx.currentTime) {
    let volume = snare_tuning["volume"];
    let attack = snare_tuning["attack"];
    let decay = snare_tuning["decay"];
    let osc_gain_ratio = 0.7;
    let osc_decay_ratio = 0.8;

    let noise = audioCtx.createBufferSource();
    noise.buffer = WHITE_NOISE;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(S_GAIN, time);
    noiseGain.gain.exponentialRampToValueAtTime(volume, time + attack)
    noiseGain.gain.setValueAtTime(volume, time + attack)
    noiseGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    let osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);

    let oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(S_GAIN, time);
    oscGain.gain.exponentialRampToValueAtTime(volume * osc_gain_ratio, time + attack)
    oscGain.gain.setValueAtTime(volume * osc_gain_ratio, time + attack)
    oscGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay * osc_decay_ratio);

    const hpFilter = audioCtx.createBiquadFilter();
    hpFilter.type = "highpass";
    hpFilter.frequency.value = 5000;

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

    let noise = audioCtx.createBufferSource();
    noise.buffer = WHITE_NOISE;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(S_GAIN, time);
    noiseGain.gain.exponentialRampToValueAtTime(volume, time + attack)
    noiseGain.gain.setValueAtTime(volume, time + attack)
    noiseGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay);

    //let osc = audioCtx.createOscillator();
    //osc.type = "square";
    //osc.frequency.setValueAtTime(300, time);

    //let oscGain = audioCtx.createGain();
    //oscGain.gain.setValueAtTime(S_GAIN, time);
    //oscGain.gain.exponentialRampToValueAtTime(volume * osc_gain_ratio, time + attack)
    //oscGain.gain.setValueAtTime(volume * osc_gain_ratio, time + attack)
    //oscGain.gain.exponentialRampToValueAtTime(S_GAIN, time + decay * osc_decay_ratio);

    const bpFilter = audioCtx.createBiquadFilter();
    bpFilter.type = "bandpass";
    bpFilter.frequency.value = 9000;
    bpFilter.Q.value = 3;

    noise.connect(bpFilter).connect(noiseGain).connect(globalGain);
    noise.start(time);
    noise.stop(time + decay);

    //osc.connect(oscGain).connect(globalGain);
    //osc.start(time);
    //osc.stop(time + decay);
}

function clap(time = audioCtx.currentTime) {
    let volume = clap_tuning["volume"];
    //let attack = clap_tuning["attack"];
    let attack = 0.01;
    let decay = clap_tuning["decay"];
    let sep = 0.015;
    const offsets = [0, sep, sep * 2, sep * 3];
    
    offsets.forEach(offset => {
       const noise = audioCtx.createBufferSource();
       noise.buffer = WHITE_NOISE;

       const filter = audioCtx.createBiquadFilter();
       filter.type = "bandpass";
       filter.frequency.value = 300;
       //filter.Q.value = 0.7;
       const gain = audioCtx.createGain();

       gain.gain.setValueAtTime(S_GAIN, time + offset);
       gain.gain.exponentialRampToValueAtTime(volume, time + offset + attack);
       gain.gain.setValueAtTime(volume, time + offset + attack);
       gain.gain.exponentialRampToValueAtTime(S_GAIN, time + offset + 0.08);

       noise.connect(filter).connect(gain).connect(globalGain);

       noise.start(time + offset);
       noise.stop(time + offset + 0.08);
    });
}


function whiteNoiseBuffer() {
    var bufferSize = audioCtx.sampleRate,
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
    output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}


let kick_tuning = {"name": "kick", "volume": 0.8, "attack": 0.01, "decay": 0.2};
let snare_tuning = {"name": "snare", "volume": 0.8, "attack": 0.01, "decay": 0.2};
let hat_tuning = {"name": "hat", "volume": 0.8, "attack": 0.01, "decay": 0.2};
let clap_tuning = {"name": "clap", "volume": 0.8, "attack": 0.01, "decay": 0.2};
let slider_scales = {"volume": 0.1, "attack": 0.01, "decay": 0.05};

let drum_tunings = [kick_tuning, snare_tuning, hat_tuning, clap_tuning];



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
