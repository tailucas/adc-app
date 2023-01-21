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

let led_pin = 2;
GPIO.set_mode(led_pin, GPIO.MODE_OUTPUT);

let input1_label = Cfg.get('app.input_1.label');
print('Input 1 label=', input1_label);
let input2_label = Cfg.get('app.input_2.label');
print('Input 2 label=', input2_label);
let input3_label = Cfg.get('app.input_3.label');
print('Input 3 label=', input3_label);
let input4_label = Cfg.get('app.input_4.label');
print('Input 4 label=', input4_label);

let input_pin1 = Cfg.get('app.input_1.pin');
let input_pin2 = Cfg.get('app.input_2.pin');
let input_pin3 = Cfg.get('app.input_3.pin');
let input_pin4 = Cfg.get('app.input_4.pin');

let adc_mode = Cfg.get('app.adc_mode');
if (adc_mode) {
  print('ADC mode enabled; using configured normal values.');
  ADC.enable(input_pin1);
  ADC.enable(input_pin2);
  ADC.enable(input_pin3);
  ADC.enable(input_pin4);
} else {
  print('GPIO mode enabled; ignoring configured normal values.');
  GPIO.set_mode(input_pin1, GPIO.MODE_INPUT);
  GPIO.set_mode(input_pin2, GPIO.MODE_INPUT);
  GPIO.set_mode(input_pin3, GPIO.MODE_INPUT);
  GPIO.set_mode(input_pin4, GPIO.MODE_INPUT);
  GPIO.set_pull(input_pin1, GPIO.PULL_UP);
  GPIO.set_pull(input_pin2, GPIO.PULL_UP);
  GPIO.set_pull(input_pin3, GPIO.PULL_UP);
  GPIO.set_pull(input_pin4, GPIO.PULL_UP);
}

let input_pin1_normal_value = Cfg.get('app.input_1.normal_value');
print('Pin', input_pin1, 'normal value=', input_pin1_normal_value);
let input_pin2_normal_value = Cfg.get('app.input_2.normal_value');
print('Pin', input_pin2, 'normal value=', input_pin2_normal_value);
let input_pin3_normal_value = Cfg.get('app.input_3.normal_value');
print('Pin', input_pin3, 'normal value=', input_pin3_normal_value);
let input_pin4_normal_value = Cfg.get('app.input_4.normal_value');
print('Pin', input_pin4, 'normal value=', input_pin4_normal_value);

let input1_active = false;
let input2_active = false;
let input3_active = false;
let input4_active = false;

let input1_value = -1;
let input2_value = -1;
let input3_value = -1;
let input4_value = -1;

let device_id = Cfg.get('device.id');
let mqtt_topic = Cfg.get('app.mqtt_topic');
let mqtt_pub_topic = mqtt_topic+'/'+Cfg.get('app.mqtt_pub_topic')+'/'+device_id;
let mqtt_heartbeat_topic = mqtt_topic+'/heartbeat/'+device_id;
let active_pub_interval_s = Cfg.get('app.active_pub_interval_s');
print('Publication interval=', active_pub_interval_s, 's');
let input_location = Cfg.get('app.input_location');
print('Physical device location=', input_location);

let sendMsg = function(topic, message) {
  let ok = MQTT.pub(topic, message, 1);
  if (debug) {
    if (!ok) {
      print('ERROR', topic, '<-', message);
    } else {
      print(topic, '<-', message);
    }
  }
};

let now = Timer.now();
let last_posted = now;
let pubMsg = function(input_active) {
  now = Timer.now();
  if (input_active && now - last_posted >= active_pub_interval_s) {
    let message = JSON.stringify({
      uptime: Sys.uptime(),
      timestamp: now,
      device_id: device_id,
      input_location: input_location,
      input_1: {input_label: input1_label, active: input1_active, sample_value: input1_value, normal_value: input_pin1_normal_value},
      input_2: {input_label: input2_label, active: input2_active, sample_value: input2_value, normal_value: input_pin2_normal_value},
      input_3: {input_label: input3_label, active: input3_active, sample_value: input3_value, normal_value: input_pin3_normal_value},
      input_4: {input_label: input4_label, active: input4_active, sample_value: input4_value, normal_value: input_pin4_normal_value}
    });
    sendMsg(mqtt_pub_topic, message);
    // send heartbeat for uptime check
    sendMsg(mqtt_heartbeat_topic, 'OK');
    last_posted = now;
  }
};

let sample_value_max = 4095;
let sample_value_tolerance = sample_value_max / Cfg.get('app.normal_value_tolerance_percent');
print('Normal value tolerance=', sample_value_tolerance);
let sample_normal = false;
let testSample = function(sample_value, normal_value, trigger_count) {
  if (adc_mode) {
    if (sample_value < normal_value - sample_value_tolerance || sample_value > normal_value + sample_value_tolerance) {
      sample_normal = false;
    } else {
      sample_normal = true;
    }
  } else {
    if (sample_value == 1) {
      sample_normal = false;
    } else {
      sample_normal = true;
    }
  }
  if (sample_normal) {
    trigger_count = 0;
  } else {
    trigger_count += 1;
  }
  return trigger_count;
};

let sample_interval_ms = Cfg.get('app.sample_interval_ms');
if (debug) {
  sample_interval_ms = 2000;
}
print('Sample interval=', sample_interval_ms, 'ms');
let trigger_dedupes = Cfg.get('app.trigger_dedupes');
print('Trigger dedupes=', trigger_dedupes);

let input_active = false;
let input_pin1_abnormal_count = 0;
let input_pin2_abnormal_count = 0;
let input_pin3_abnormal_count = 0;
let input_pin4_abnormal_count = 0;
Timer.set(sample_interval_ms, true /* repeat */, function() {
    // disable LED
    GPIO.write(led_pin, 0);
    input_active = false;
    if (adc_mode) {
      input1_value = ADC.read(input_pin1);
    } else {
      input1_value = GPIO.read(input_pin1);
    }
    input_pin1_abnormal_count = testSample(input1_value, input_pin1_normal_value, input_pin1_abnormal_count);
    if (input_pin1_abnormal_count > trigger_dedupes) {
      input1_active = true;
      input_active = true;
      // LED
      GPIO.write(led_pin, 1);
    }
    if (input_pin1_abnormal_count === 0) {
      input1_active = false;
    }
    if (debug) {
      print('Pin', input_pin1, 'sampled', input1_value, 'abnormal count', input_pin1_abnormal_count, 'active?', input1_active);
    }
    if (adc_mode) {
      input2_value = ADC.read(input_pin2);
    } else {
      input2_value = GPIO.read(input_pin2);
    }
    input_pin2_abnormal_count = testSample(input2_value, input_pin2_normal_value, input_pin2_abnormal_count);
    if (input_pin2_abnormal_count > trigger_dedupes) {
      input2_active = true;
      input_active = true;
      // LED
      GPIO.write(led_pin, 1);
    }
    if (input_pin2_abnormal_count === 0) {
      input2_active = false;
    }
    if (debug) {
      print('Pin', input_pin2, 'sampled', input2_value, 'abnormal count', input_pin2_abnormal_count, 'active?', input2_active);
    }
    if (adc_mode) {
      input3_value = ADC.read(input_pin3);
    } else {
      input3_value = GPIO.read(input_pin3);
    }
    input_pin3_abnormal_count = testSample(input3_value, input_pin3_normal_value, input_pin3_abnormal_count);
    if (input_pin3_abnormal_count > trigger_dedupes) {
      input3_active = true;
      input_active = true;
      // LED
      GPIO.write(led_pin, 1);
    }
    if (input_pin3_abnormal_count === 0) {
      input3_active = false;
    }
    if (debug) {
      print('Pin', input_pin3, 'sampled', input3_value, 'abnormal count', input_pin3_abnormal_count, 'active?', input3_active);
    }
    if (adc_mode) {
      input4_value = ADC.read(input_pin4);
    } else {
      input4_value = GPIO.read(input_pin4);
    }
    input_pin4_abnormal_count = testSample(input4_value, input_pin4_normal_value, input_pin4_abnormal_count);
    if (input_pin4_abnormal_count > trigger_dedupes) {
      input4_active = true;
      input_active = true;
      // LED
      GPIO.write(led_pin, 1);
    }
    if (input_pin4_abnormal_count === 0) {
      input4_active = false;
    }
    if (debug) {
      print('Pin', input_pin4, 'sampled', input4_value, 'abnormal count', input_pin4_abnormal_count, 'active?', input4_active);
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