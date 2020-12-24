load('api_config.js');
load('api_adc.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');

let debug = Cfg.get('app.debug');
let mqtt_topic = Cfg.get('app.mqtt_pub_topic');
let active_pub_interval_s = Cfg.get('app.active_pub_interval_s');
let now = Timer.now();

let adc_pin1 = Cfg.get('app.input_1.pin');
let adc_pin2 = Cfg.get('app.input_2.pin');
let adc_pin3 = Cfg.get('app.input_3.pin');

let input_label1 = Cfg.get('app.input_1.label');
let input_label2 = Cfg.get('app.input_2.label');
let input_label3 = Cfg.get('app.input_3.label');

let adc_pin1_normal_value = Cfg.get('app.input_1.normal_value');
let adc_pin1_normal_value_high = adc_pin1_normal_value * 1.1;
let adc_pin1_normal_value_low = adc_pin1_normal_value * 0.9;

let adc_pin2_normal_value = Cfg.get('app.input_2.normal_value');
let adc_pin2_normal_value_high = adc_pin2_normal_value * 1.1;
let adc_pin2_normal_value_low = adc_pin2_normal_value * 0.9;

let adc_pin3_normal_value = Cfg.get('app.input_3.normal_value');
let adc_pin3_normal_value_high = adc_pin3_normal_value * 1.1;
let adc_pin3_normal_value_low = adc_pin3_normal_value * 0.9;

let adc_pin1_abnormal_count = 0;
let adc_pin2_abnormal_count = 0;
let adc_pin3_abnormal_count = 0;

let sample_value1 = 0;
let sample_value2 = 0;
let sample_value3 = 0;

let pubMsg = function(input_active) {
  now = Timer.now();
  if (input_active && now - last_posted >= active_pub_interval_s) {
    let message = JSON.stringify({
      uptime: Sys.uptime(),
      timestamp: now,
      input_1: {label: input_label1, sample_value: sample_value1},
      input_2: {label: input_label2, sample_value: sample_value2},
      input_3: {label: input_label3, sample_value: sample_value3}
    });
    let ok = MQTT.pub(mqtt_topic, message, 1);
    if (debug) {
      if (!ok) {
        print('ERROR', mqtt_topic, '<-', message);
      } else {
        print(mqtt_topic, '<-', message);
      }
    }
    last_posted = now;
  }
};

let trigger_dedupes = Cfg.get('app.trigger_dedupes');
let sample_interval_ms = Cfg.get('app.sample_interval_ms');
if (debug) {
  sample_interval_ms = 2000;
}

ADC.enable(adc_pin1);
ADC.enable(adc_pin2);
ADC.enable(adc_pin3);

let input_active = false;
Timer.set(sample_interval_ms, true /* repeat */, function() {
    // "low" is 4096, "high" is 0
    sample_value1 = ADC.read(adc_pin1);
    sample_value2 = ADC.read(adc_pin2);
    sample_value3 = ADC.read(adc_pin3);
    input_active = false;
    if (sample_value1 < adc_pin1_normal_value_low && sample_value1 > adc_pin1_normal_value_high) {
      adc_pin1_abnormal_count += 1;
    } else {
      adc_pin1_abnormal_count = 0;
    }
    if (adc_pin1_abnormal_count > trigger_dedupes) {
      input_active = true;
    }
    if (sample_value2 < adc_pin2_normal_value_low && sample_value2 > adc_pin2_normal_value_high) {
      adc_pin2_abnormal_count += 1;
    } else {
      adc_pin2_abnormal_count = 0;
    }
    if (adc_pin2_abnormal_count > trigger_dedupes) {
      input_active = true;
    }
    if (sample_value3 < adc_pin3_normal_value_low && sample_value3 > adc_pin3_normal_value_high) {
      adc_pin3_abnormal_count += 1;
    } else {
      adc_pin3_abnormal_count = 0;
    }
    if (adc_pin3_abnormal_count > trigger_dedupes) {
      input_active = true;
    }
    if (debug) {
      print('Pin', adc_pin1, 'sampled', sample_value1, 'abnormal count', adc_pin1_abnormal_count);
      print('Pin', adc_pin2, 'sampled', sample_value2, 'abnormal count', adc_pin2_abnormal_count);
      print('Pin', adc_pin3, 'sampled', sample_value3, 'abnormal count', adc_pin3_abnormal_count);
    }
    pubMsg(input_active);
}, null);

let heartbeat_interval = Cfg.get('app.heartbeat_pub_interval_s');
Timer.set(heartbeat_interval * 1000, true /* repeat */, function() {
  pubMsg(true);
}, null);