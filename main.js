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

})

const INPUT_MAP = {
    "k": () => kick(),
    "s": () => snare(),
    "h": () => hat()
}
const REST_KEY = "x"
const S_GAIN = 0.0001
let timer;
let playing = false;

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
    let tickRate = 60 / bpm
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
    let volume = kickTuning["volume"];
    let attack = kickTuning["attack"];
    let decay = kickTuning["decay"];
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

    osc.connect(gain).connect(globalGain);

    osc.start();
    osc.stop(time + decay);
}


function snare(time = audioCtx.currentTime) {
    let volume = snareTuning["volume"];
    let attack = snareTuning["attack"];
    let decay = snareTuning["decay"];
    let osc_gain_ratio = 0.7;
    let osc_decay_ratio = 0.8;

    let noise = audioCtx.createBufferSource();
    noise.buffer = whiteNoiseBuffer();

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
    let volume = hatTuning["volume"];
    let attack = hatTuning["attack"];
    let decay = hatTuning["decay"];

    let noise = audioCtx.createBufferSource();
    noise.buffer = whiteNoiseBuffer();

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


function whiteNoiseBuffer() {
    var bufferSize = 10 * audioCtx.sampleRate,
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
    output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}


let kickTuning = {"volume": 0.8, "attack": 0.01, "decay": 0.2};
let snareTuning = {"volume": 0.8, "attack": 0.01, "decay": 0.2};
let hatTuning = {"volume": 0.8, "attack": 0.01, "decay": 0.2};
let sliderScales = {"volume": 0.1, "attack": 0.01, "decay": 0.05};

function updateTuning() {
    kickTuning["volume"] = document.getElementById("kickVolume").value * sliderScales["volume"];
    kickTuning["attack"] = document.getElementById("kickAttack").value * sliderScales["attack"];
    kickTuning["decay"] = document.getElementById("kickDecay").value * sliderScales["decay"];

    snareTuning["volume"] = document.getElementById("snareVolume").value * sliderScales["volume"];
    snareTuning["attack"] = document.getElementById("snareAttack").value * sliderScales["attack"];
    snareTuning["decay"] = document.getElementById("snareDecay").value * sliderScales["decay"];

    hatTuning["volume"] = document.getElementById("hatVolume").value * sliderScales["volume"];
    hatTuning["attack"] = document.getElementById("hatAttack").value * sliderScales["attack"];
    hatTuning["decay"] = document.getElementById("hatDecay").value * sliderScales["decay"];

    globalGain.gain.setValueAtTime(document.getElementById("masterVolume").value * sliderScales["volume"],
        audioCtx.currentTime);
}
