<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

## About The Project

See my write-up on [IoT with Mongoose OS](https://tailucas.github.io/update/2023/06/07/iot-with-mongoose-os.html). Here you can find a brief write-up about my projects based on Mongoose OS and my general experience with this IoT platform.

This is a [Mongoose OS][mongoose-url] project containing a [configuration template][app-config-url] and [code][app-script-url] written in the so-called minimal JavaScript or [mJS](https://github.com/cesanta/mjs).

### How it works

This project makes use of a choice between GPIO and analog-to-digital (ADC) inputs as sensory inputs for a security appliance. The [project configuration][app-config-url] should give some hints as to its use. Configuration key prefixes `app.input` provide labels that are then used in MQTT messages.

Given the simplicity of the program and the constraints of mJS, you will notice overt duplication of logic for each of the required input channels.

### Basic operation

At startup, the inputs are initialized based on the selected choice of ADC mode or GPIO mode. I was experimenting with the difference between the approach of sampling effective electrical resistance versus pulling the GPIO channels. Since the code was written, I decided to leave both in this implementation. Fork what works for you.

Two timers are started. The first timer is responsible for sampling the inputs at a configured rate, applying some trigger de-duplication logic, and then the second is responsible for sending heartbeat messages in the absence of any input deemed in an *active* state. If a sampled input is outside of the configured threshold, then an MQTT message is sent which contains some summary information about all inputs, including the one that is in an active state.

The use of the onboard LED pin provides useful feedback for when a given input has been deemed triggered.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

Technologies that help make this project useful:

[![Espressif][esp-shield]][esp-url]
[![Mongoose OS][mongoose-shield]][mongoose-url]
[![MQTT][mqtt-shield]][mqtt-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Here is some detail about the intended use of this project.

## Prerequisites

Your development environment needs to have the `mos` [tool][mos-tool-url] available to build firmware binaries and for first-time configuration of the device. Mongoose OS has a good [getting started guide][mos-install-url] with installation instructions.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

The Mongoose OS [documentation](https://mongoose-os.com/docs/mongoose-os/userguide/build.md) provides a detailed but concise instruction on how to use the `mos` tool to build the binaries that can then either be flashed directly to a USB-connected IoT device or that can be uploaded to the [mDash][mdash-url] site and delivered as an [OTA update](https://mongoose-os.com/docs/mongoose-os/userguide/ota.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Template on which this README is based](https://github.com/othneildrew/Best-README-Template)
* [All the Shields](https://github.com/progfay/shields-with-icon)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/tailucas/adc-app.svg?style=for-the-badge
[contributors-url]: https://github.com/tailucas/adc-app/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/tailucas/adc-app.svg?style=for-the-badge
[forks-url]: https://github.com/tailucas/adc-app/network/members
[stars-shield]: https://img.shields.io/github/stars/tailucas/adc-app.svg?style=for-the-badge
[stars-url]: https://github.com/tailucas/adc-app/stargazers
[issues-shield]: https://img.shields.io/github/issues/tailucas/adc-app.svg?style=for-the-badge
[issues-url]: https://github.com/tailucas/adc-app/issues
[license-shield]: https://img.shields.io/github/license/tailucas/adc-app.svg?style=for-the-badge
[license-url]: https://github.com/tailucas/adc-app/blob/main/LICENSE

[app-script-url]: https://github.com/tailucas/adc-app/blob/master/fs/init.js
[app-config-url]: https://github.com/tailucas/adc-app/blob/master/mos.yml

[esp-url]: https://www.espressif.com/
[esp-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=Espressif&color=E7352C&logo=Espressif&logoColor=FFFFFF&label=
[mdash-url]: https://mdash.net/home/
[mongoose-url]: https://mongoose-os.com/
[mongoose-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=Mongoose&color=880000&logo=Mongoose&logoColor=FFFFFF&label=
[mos-tool-url]: https://mongoose-os.com/docs/mongoose-os/userguide/mos-tool.md
[mos-install-url]: https://mongoose-os.com/docs/mongoose-os/quickstart/setup.md
[mqtt-url]: https://mqtt.org/
[mqtt-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=MQTT&color=660066&logo=MQTT&logoColor=FFFFFF&label=
