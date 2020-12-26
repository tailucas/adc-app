load('api_config.js');
load('api_adc.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');

let debug = Cfg.get('app.debug');
if (debug) {
  print('DEBUG MODE ENABLED');
}

let input1_label = Cfg.get('app.input_1.label');
print('Input 1 label=', input1_label);
let input2_label = Cfg.get('app.input_2.label');
print('Input 2 label=', input2_label);
let input3_label = Cfg.get('app.input_3.label');
print('Input 3 label=', input3_label);

let input1_active = false;
let input2_active = false;
let input3_active = false;

let input1_value = -1;
let input2_value = -1;
let input3_value = -1;

let mqtt_topic = Cfg.get('app.mqtt_pub_topic');
let active_pub_interval_s = Cfg.get('app.active_pub_interval_s');
print('Publication interval=', active_pub_interval_s, 's');
let input_location = Cfg.get('app.input_location');
print('Physical device location=', input_location);
let now = Timer.now();
let last_posted = now;
let pubMsg = function(input_active) {
  now = Timer.now();
  if (input_active && now - last_posted >= active_pub_interval_s) {
    let message = JSON.stringify({
      uptime: Sys.uptime(),
      timestamp: now,
      input_location: input_location,
      input_1: {input_label: input1_label, active: input1_active, sample_value: input1_value},
      input_2: {input_label: input2_label, active: input2_active, sample_value: input2_value},
      input_3: {input_label: input3_label, active: input3_active, sample_value: input3_value}
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
print('Trigger dedupes=', trigger_dedupes);
let sample_interval_ms = Cfg.get('app.sample_interval_ms');
if (debug) {
  sample_interval_ms = 2000;
}
print('Sample interval=', sample_interval_ms, 'ms');
let sample_value_max = 4095;
let sample_value_tolerance = sample_value_max / Cfg.get('app.normal_value_tolerance_percent');
print('Normal value tolerance=', sample_value_tolerance);
let sample_normal = false;
let testSample = function(sample_value, normal_value, trigger_count) {
  if (sample_value < normal_value - sample_value_tolerance || sample_value > normal_value + sample_value_tolerance) {
    sample_normal = false;
  } else {
    sample_normal = true;
  }
  if (sample_normal) {
    trigger_count = 0;
  } else {
    trigger_count += 1;
  }
  return trigger_count;
};

let adc_pin1 = Cfg.get('app.input_1.pin');
let adc_pin2 = Cfg.get('app.input_2.pin');
let adc_pin3 = Cfg.get('app.input_3.pin');

let adc_pin1_normal_value = Cfg.get('app.input_1.normal_value');
print('Pin', adc_pin1, 'normal value=', adc_pin1_normal_value);
let adc_pin2_normal_value = Cfg.get('app.input_2.normal_value');
print('Pin', adc_pin2, 'normal value=', adc_pin2_normal_value);
let adc_pin3_normal_value = Cfg.get('app.input_3.normal_value');
print('Pin', adc_pin3, 'normal value=', adc_pin3_normal_value);

ADC.enable(adc_pin1);
ADC.enable(adc_pin2);
ADC.enable(adc_pin3);

let input_active = false;
let adc_pin1_abnormal_count = 0;
let adc_pin2_abnormal_count = 0;
let adc_pin3_abnormal_count = 0;
Timer.set(sample_interval_ms, true /* repeat */, function() {
    input_active = false;
    input1_active = false;
    input2_active = false;
    input3_active = false;
    input1_value = ADC.read(adc_pin1);
    adc_pin1_abnormal_count = testSample(input1_value, adc_pin1_normal_value, adc_pin1_abnormal_count);
    if (adc_pin1_abnormal_count > trigger_dedupes) {
      input1_active = true;
      input_active = true;
    }
    if (debug) {
      print('Pin', adc_pin1, 'sampled', input1_value, 'abnormal count', adc_pin1_abnormal_count, 'active?', input1_active);
    }
    input2_value = ADC.read(adc_pin2);
    adc_pin2_abnormal_count = testSample(input2_value, adc_pin2_normal_value, adc_pin2_abnormal_count);
    if (adc_pin2_abnormal_count > trigger_dedupes) {
      input2_active = true;
      input_active = true;
    }
    if (debug) {
      print('Pin', adc_pin2, 'sampled', input2_value, 'abnormal count', adc_pin2_abnormal_count, 'active?', input2_active);
    }
    input3_value = ADC.read(adc_pin3);
    adc_pin3_abnormal_count = testSample(input3_value, adc_pin3_normal_value, adc_pin3_abnormal_count);
    if (adc_pin3_abnormal_count > trigger_dedupes) {
      input3_active = true;
      input_active = true;
    }
    if (debug) {
      print('Pin', adc_pin3, 'sampled', input3_value, 'abnormal count', adc_pin3_abnormal_count, 'active?', input3_active);
    }
    if (debug) {
      print('Any input is active?', input_active);
    }
    pubMsg(input_active);
}, null);

let heartbeat_interval_s = Cfg.get('app.heartbeat_pub_interval_s');
if (debug) {
  heartbeat_interval_s = 5;
}
print('Hearbeat interval=', heartbeat_interval_s, 's');
Timer.set(heartbeat_interval_s * 1000, true /* repeat */, function() {
  pubMsg(true);
}, null);