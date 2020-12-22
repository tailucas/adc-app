load('api_config.js');
load('api_adc.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');

print('DEBUG: HELLO');
if (MQTT.isConnected()) {
    print('MQTT connected!');
} else {
    print('MQTT NOT connected!');
}

let debug = true;

// let mqtt_topic = 'meter/electricity/'+Cfg.get('device.id');
let mqtt_topic = 'test';

let sample_value = 0;

let pubMsg = function() {
  let message = JSON.stringify({
    uptime: Sys.uptime(),
    last_sample_value: sample_value,
  });
  let ok = MQTT.pub(mqtt_topic, message, 1);
  if (debug) {
    if (!ok) {
      print('ERROR', mqtt_topic, '<-', message);
    } else {
      print(mqtt_topic, '<-', message);
    }
  }
};

let adc_pin = 34;
let sample_rate = 2000;
if (debug) {
  sample_rate = 2000;
}

ADC.enable(adc_pin);
Timer.set(sample_rate, true /* repeat */, function() {
    // "low" is 4096, "high" is 0
    sample_value = ADC.read(adc_pin);
    if (debug) {
        print('Pin', adc_pin, 'sampled', sample_value);
    }
    pubMsg();
}, null);