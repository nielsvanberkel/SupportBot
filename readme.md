# Code for Crowdsourcing Perceptions of Fair Predictors for Machine Learning: A Recidivism Case Study

This repo contains code for an automated Slack bot as used in the CSCW 2019 publication [Crowdsourcing Perceptions of Fair Predictors for Machine Learning: A Recidivism Case Study](https://www.nielsvanberkel.com/files/publications/cscw2019a.pdf). The Slack bot is built with [Botkit](https://botkit.ai).

See 'skills/application.js' for the main functionality of the bot. The bot structures conversation among participants, keeps track of voting behaviour, listens to a number of commands (e.g., 'ready'), and presents a final survey upon completion of the study. The application also takes care of loading and presenting images, in-line voting buttons, and eventual database storage. All interaction between participant(s) and the bot take place within a Slack channel previously set up by the researcher.

Set up your database details and Slack application credentials in the .env file.

Please see readme-botkit.md for additional information on configuring Botkit.