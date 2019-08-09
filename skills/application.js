var assets = require("./../assets");
var express = require("express");

var app = express();
app.use("/assets", assets);

// Variables:
// counter: Where among the question list the worker is
// start_time: Time UNIX (milliseconds) at which worker was shown a variable
// ongoing: Keeps track as to whether a vote is ongoing (block participant from hitting 'next')
// votes_cast: Keeps track of number of votes cast (particularly relevant in team conditions)

var available_groups = ['']; // Fill this with the IDs of the Slack channels set up

var images = [{
    title: 'Age',
    description: 'Effect of the age of the offender at time of conviction on chance of recidivism',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fage.png?v=1565201913584'
}, {
    title: 'Sex',
    description: 'Effect of the sex of the offender on chance of recidivism',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fsex.png?v=1565201910250'
}, {
    title: 'Race',
    description: 'Effect of the race of the offender on chance of recidivism',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Frace.png?v=1565201912351'
}, {
    title: 'Prior charges',
    description: 'Effect of the number of prior non-juvenile (committed at 19 years or older) charges',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fpriors_count.png?v=1565201911174'
}, {
    title: 'Juvenile felony charges',
    description: 'Effect of the number of juvenile (committed at 18 years or younger) felony charges',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fpriors_juv_fel_count.png?v=1565201911491'
}, {
    title: 'Juvenile misdemeanor charges',
    description: 'Effect of the number of juvenile (committed at 18 years or younger) misdemeanor charges',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fpriors_juv_misd_count.png?v=1565201911940'
}, {
    title: 'Degree of the charge',
    description: 'Effect of the degree of the charge. A felony is a crime punishable by imprisonment in excess of one year, a misdemeanor is a crime punishable by imprisonment of exactly one year or less.',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fcharge_degree.png?v=1565201910570'
}, {
    title: 'Risk of violence',
    description: 'Effect of risk of violence. A numeric value between 1 and 10 corresponding to the assessed risk of violence of the defendant (a small number corresponds to a low risk, a larger number corresponds to a high risk)',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Friskviolence.png?v=1565201913026'
}, {
    title: 'Risk of recidivism',
    description: 'Effect of risk of recidivism. A numeric value between 1 and 10 corresponding to the recidivism risk score of the defendant (a small number corresponds to a low risk, a larger number corresponds to a high risk)',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Friskrecidivism.png?v=1565201912280'
}, {
    title: 'Dominant hand',
    description: 'Effect of the dominant hand of the offender on chance of recidivism',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fdominant_hand.png?v=1565201910220'
}, {
    title: 'Height',
    description: 'Effect of the height of the offender on chance of recidivism',
    link: 'https://cdn.glitch.com/ebe74adb-e2b9-4b47-bab6-4e98d1983aab%2Fheight.png?v=1565201910548'
}];

function getImage(counter, bot, message, controller) {
    console.log("Counter value: " + counter);

    // check if there's still images left to rate
    if (counter < images.length) {
        controller.storage.channels.get(message.channel, (err, data) => {
            if (err || !data) {
                console.log("Error or no data yet, lets create : " + err);
                data = {
                    id: message.channel,
                    ongoing: ''
                };
            }
            data.ongoing = true;

            controller.storage.channels.save(data, function (err) {
                if (err) throw err;

                var image = data.images[counter];
                var readable_counter = counter + 1;

                var reply_with_attachments = {
                    text: image['description'] + ' (' + readable_counter + '/' + images.length + ').',
                    attachments: [{
                        "image_url": image['link'],
                        "title": image['title']
                    }],
                    icon_url: '',
                };

                bot.startConversation(message, function (err, convo) {
                    if (data.revote == true) {
                        convo.say("Thank you for taking part in the discussion! Could you please give me your opinion on this parameter again?");
                    }
                    convo.say(reply_with_attachments);

                    controller.storage.channels.get(message.channel, (err, data) => {
                        if (err || !data) {
                            console.log("Error or no data yet, lets create : " + err);
                            data = {
                                id: message.channel,
                                start_time: ''
                            };
                        }

                        data.start_time = Date.now();
                        data.votes_cast = 0;

                        var output = '';
                        for (var property in data) {
                            output += property + ': ' + data[property] + '; ';
                        }

                        controller.storage.channels.save(data, function (err) {
                            console.log("Saving data");
                            if (err) throw err;
                            setTimeout(function () {
                                askOpinion(bot, message);
                            }, 4500);
                        });
                    });
                });
            });
        });
    } else {
        initialiseSurvey(bot, message);
    }
}

function askOpinion(bot, message) {
    // We want to send the question to all members of the channel privately.
    // Therefore, have to get info of who is in the channel.
    bot.api.groups.info({
        channel: message.channel
    }, (err, response) => {
        if (err) {
            console.log("Error: " + err);
        } else {
            var group = response['group'];
            console.log("group: " + response['group']);

            for (var i = 0, len = group.members.length; i < len; i++) {
                console.log("group.members[i]: " + i + " " + group.members[i]);
                var user = group.members[i];

                bot.sendEphemeral({
                    channel: message.channel,
                    user: user,
                    attachments: [{
                        "text": "Should this parameter be considered when predicting recidivism?",
                        "callback_id": "vote-test",
                        "fallback": "",
                        "actions": [{
                                "name": "keep",
                                "text": "Yes, include this parameter",
                                "type": "button",
                                "value": "keep"
                            },
                            {
                                "name": "remove",
                                "text": "No, exclude this parameter",
                                "type": "button",
                                "value": "remove"
                            }
                        ]
                    }]
                });
            }
        }
    });
}

function insertDatabase(message, answer, userid, username, question_id_loc, comment, controller) {
    console.log("Database called. Message: " + message + " answer: " + answer);
    var condition = process.env.condition;

    // Database
    var mysql = require('mysql');

    var con = mysql.createConnection({
        host: process.env.db_host,
        user: process.env.db_user,
        password: process.env.db_password,
        database: process.env.db_database
    });

    con.connect(function (err) {
        if (err) {
            throw err;
        }
        console.log("Connected!");

        controller.storage.channels.get(message.channel, (err, data) => {
            var group = message.channel; // get group id from message channel
            var completion_time = Date.now();

            var start_time = data.start_time;
            var comment = "";

            console.log("DEBUG PRINT ALL " + completion_time + " " + userid + " " + group + " " + condition + " " + question_id_loc + " " + answer + " " + comment + " " + start_time)

            con.query('INSERT INTO image_results (id, timestamp, timestamp_epoch, user_id, user_name, taskgroup, taskcondition, question_id, answer, comment, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [null, null, completion_time, userid, username, group, condition, question_id_loc, answer, comment, start_time],
                function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
        });
    });
}

function insertDatabaseSurvey(message, age, gender, income, race, reflection, userid, username, group, condition, controller) {
    // Database
    var mysql = require('mysql');

    var con = mysql.createConnection({
        host: process.env.db_host,
        user: process.env.db_user,
        password: process.env.db_password,
        database: process.env.db_database
    });

    con.connect(function (err) {
        if (err) {
            throw err;
        }
        console.log("Connected!");

        // hier4
        controller.storage.channels.get(message.channel, (err, data) => {
            var output = '';
            for (var property in data) {
                output += property + ': ' + data[property] + '; ';
            }
            console.log("Debug : " + output);

            var group = message.channel; // get group id from message channel
            var completion_time = Date.now();
            var start_time = data.start_time;

            con.query('INSERT INTO survey_results (id, timestamp, timestamp_epoch, user_id, user_name, taskgroup, taskcondition, age, gender, income, race, reflection, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [null, null, completion_time, userid, username, group, condition, age, gender, income, race, reflection, start_time],
                function (err, result) {
                    if (err) throw err;
                    console.log("1 survey record inserted");
                });
        });
    });
}

function initialiseSurvey(bot, message) {
    // We want to send the survey to all members of the channel privately.
    // Therefore, have to get info of who is in the channel.
    bot.api.groups.info({
        channel: message.channel
    }, (err, response) => {
        if (err) {
            console.log("Error Niels: " + err);
        } else {
            var group = response['group'];

            for (var i = 0, len = group.members.length; i < len; i++) {
                var user = group.members[i];

                bot.sendEphemeral({
                    channel: message.channel,
                    user: user,
                    "attachments": [{
                        "text": "Ready to take the final completion survey?",
                        "callback_id": "survey",
                        "fallback": "",
                        "actions": [{
                            "name": "survey",
                            "text": "Fill out completion survey",
                            "type": "button",
                            "value": "survey"
                        }]
                    }]
                });
            }
        }
    });
}

module.exports = function (controller) {
    controller.on('user_channel_join,user_group_join', function (bot, message) {
        var output = '';
        for (var property in message) {
            output += property + ': ' + message[property] + '; ';
        }

        var intro_completed = false;

        if (process.env.condition == "team") {
            bot.reply(message, 'Welcome, <@' + message.user + '>!');
            bot.api.groups.info({
                channel: message.channel
            }, (err, response) => {
                if (err) {
                    console.log("Error Niels: " + err);
                } else {
                    var group = response['group'];
                    var currentGroupSize = group.members.length - 2; // want to remove bot and observer (researcher) from count

                    if (intro_completed == false) {
                        intro_completed = true;
                        if (currentGroupSize == 1) {
                            bot.reply(message, "Waiting for two more persons to join your group.");
                        } else if (currentGroupSize == 2) {
                            bot.reply(message, "Waiting for one more person to join your group.");
                        } else {
                            function wait() {
                                setTimeout(function () {
                                    // everyone has joined -- time to give explanation
                                    bot.startConversation(message, function (err, convo) {
                                        convo.say({
                                            text: "Thank you all for joining in this task! :slightly_smiling_face: I am Support Bot, and I will explain the task at hand. You will be working to complete this task as a team.",
                                            delay: 2000
                                        });
                                        convo.say({
                                            text: 'Today, many businesses and organisations use statistical models to optimise their processes. For example, banks could use statistical models to calculate whether you would pay back your loan on time before granting you this loan. To do so, the bank may use your income, age, and postal code, among many other parameters.',
                                            delay: 8000
                                        });
                                        convo.say({
                                            text: 'Given the increased capabilities of these statistical models, they are increasingly used in society, including not only likelihood of loan payments, but also to assess your job capabilities or likelihood of recidivism (tendency of a convicted criminal to reoffend).',
                                            delay: 8000
                                        });
                                        convo.say({
                                            text: 'In this assignment you will focus on a statistical model used to predict recidivism. Based on historical data on recidivism in Florida, we calculated the effect of various parameters on the likelihood of recidivism. I will show you the effect of individual parameters, after which I will ask you to decide whether the parameter should be included or excluded from the statistical model. You may consider it \'fair\' to exclude a certain parameter, although this may decrease the ability of the model to accurately predict recidivism. The images that I will present give an indicator of the effect of the parameter on recidivism risk.',
                                            delay: 10000
                                        });
                                        convo.say({
                                            text: 'There is no right or wrong answer here, although I will ask you to motivate your choices. Prior to discussing an individual parameter, you will provide your individual opinion first (unknown to your teammates). After that I will ask you to argue your choices to your teammates. Once discussion has been completed I will present the next parameter or ask you to reconsider your opinion. Please introduce yourself to your teammates, and when you are ready to proceed type \'<@' + bot.identity.name + '> ready\'. We can proceed when all three of you have told me to start the task.',
                                            delay: 9000
                                        });
                                        convo.next();
                                    });
                                }, 6500);
                            }
                            wait(); // considerable delay to reduce confusion and allow 3th person to find channel
                        }
                    }
                }
            });
        } else if (process.env.condition == "manager") {
            bot.reply(message, 'Welcome, <@' + message.user + '>!');
            bot.api.groups.info({
                channel: message.channel
            }, (err, response) => {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    var group = response['group'];
                    var currentGroupSize = group.members.length - 2; // Remove bot and observer (researcher) from count

                    if (intro_completed == false) {
                        intro_completed = true;
                        if (currentGroupSize == 1) {
                            bot.reply(message, "Waiting for two more persons to join your group.");
                        } else if (currentGroupSize == 2) {
                            bot.reply(message, "Waiting for one more person to join your group.");
                        } else {
                            // everyone has joined -- time to give explanation
                            // member array [0,1] are admin and the bot
                            // member array [2,3,4] are members -- select random member from these
                            var random = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
                            var manager = group.members[random];

                            controller.storage.channels.get(message.channel, (err, data) => {
                                if (err || !data) {
                                    console.log("Error or no data yet, lets create : " + err);
                                    data = {
                                        id: message.channel,
                                        manager: ''
                                    };
                                }
                                data.manager = manager;

                                controller.storage.channels.save(data, function (err) {
                                    if (err) throw err;

                                    function wait() {
                                        setTimeout(function () {
                                            bot.startConversation(message, function (err, convo) {
                                                convo.say({
                                                    text: 'Thank you all for joining in this task! :slightly_smiling_face: I am Support Bot, and I will explain the task at hand. \<@' + manager + '> will be responsible for leading and directing the team.',
                                                    delay: 2000
                                                });
                                                convo.say({
                                                    text: 'Today, many businesses and organisations use statistical models to optimise their processes. For example, banks could use statistical models to calculate whether you would pay back your loan on time before granting you this loan. To do so, the bank may use your income, age, and postal code, among many other parameters.',
                                                    delay: 8000
                                                });
                                                convo.say({
                                                    text: 'Given the increased capabilities of these statistical models, they are increasingly used in society, including not only likelihood of loan payments, but also to assess your job capabilities or likelihood of recidivism (tendency of a convicted criminal to reoffend).',
                                                    delay: 8000
                                                });
                                                convo.say({
                                                    text: 'In this assignment you will focus on a statistical model used to predict recidivism. Based on historical data on recidivism in Florida, we calculated the effect of various parameters on the likelihood of recidivism. I will show you the effect of individual parameters, after which I will ask you to decide whether the parameter should be included or excluded from the statistical model. You may consider it \'fair\' to exclude a certain parameter, although this may decrease the ability of the model to accurately predict recidivism. The images that I will present give an indicator of the effect of the parameter on recidivism risk.',
                                                    delay: 10000
                                                });
                                                convo.say({
                                                    text: 'There is no right or wrong answer here, although I will ask you to motivate your choices. Prior to discussing an individual parameter, you will provide your individual opinion first (unknown to your teammates). After that I will ask you to argue your choices to your teammates. Once discussion has been completed I will present the next parameter or ask you to reconsider your opinion. Please introduce yourself to your teammates, and when you are ready to proceed your team captain \<@' + manager + '> can type \'<@' + bot.identity.name + '> ready\' to start the task.',
                                                    delay: 9000
                                                });
                                                convo.next();
                                            });
                                        }, 6500);
                                    }
                                    wait(); // considerable delay to reduce confusion and allow 3th person to find channel                           
                                });
                            });
                        }
                    }
                }
            });
        } else {
            // solo mode
            bot.reply(message, 'Welcome, <@' + message.user + '>!');
            bot.startConversation(message, function (err, convo) {
                convo.say({
                    text: "Thank you for joining in this task! :slightly_smiling_face: I am Support Bot, and I will explain the task at hand.",
                    delay: 2000
                });
                convo.say({
                    text: 'Today, many businesses and organisations use statistical models to optimise their processes. For example, banks could use statistical models to calculate whether you would pay back your loan on time before granting you this loan. To do so, the bank may use your income, age, and postal code, among many other parameters.',
                    delay: 8000
                });
                convo.say({
                    text: 'Given the increased capabilities of these statistical models, they are increasingly used in society, including not only likelihood of loan payments, but also to assess your job capabilities or likelihood of recidivism (tendency of a convicted criminal to reoffend).',
                    delay: 8000
                });
                convo.say({
                    text: 'In this assignment you will focus on a statistical model used to predict recidivism. Based on historical data on recidivism in Florida, we calculated the effect of various parameters on the likelihood of recidivism. I will show you the effect of individual parameters, after which I will ask you to decide whether the parameter should be included or excluded from the statistical model. You may consider it \'fair\' to exclude a certain parameter, although this may decrease the ability of the model to accurately predict recidivism. The images that I will present give an indicator of the effect of the parameter on recidivism risk.',
                    delay: 10000
                });
                convo.say({
                    text: 'There is no right or wrong answer here, although I will ask you to motivate your choices. After you motivated your choice I will present the next parameter. When you are ready to proceed type \'<@' + bot.identity.name + '> ready\'.',
                    delay: 9000
                });
                convo.next();
            });
        }
    });

    // We only want to start once. If multiple team members say ready we don't want to trigger
    controller.hears(['ready'], 'direct_message,direct_mention', function (bot, message) {

        if (typeof message == "undefined") {
            return;
        }

        controller.storage.channels.get(message.channel, (err, data) => {
            if (process.env.condition == "team") {
                if (err || !data) {
                    console.log("Error or no data yet, lets create : " + err);
                    data = {
                        id: message.channel,
                        start_counter: 0,
                        members_reg: ''
                    };
                }
                if (typeof data.images !== "undefined") {
                    // If it already exist, should not listen to ready
                    console.log("data . images exists, calling return");
                    return;
                }

                var output = '';
                for (var property in data) {
                    output += property + ': ' + data[property] + '; ';
                }

                // Make sure all members are unique who say 'start'
                // We want all participants to say 'ready' in team condition before we proceed
                if (typeof data.start_counter == 0) {
                    if (!data.members_reg.includes(message.user)) {
                        data.start_counter = 1;
                        data.members_reg += message.user;
                        bot.reply(message, "Waiting for two more persons to indicate ready to start.");
                        controller.storage.channels.save(data, function (err) {
                            console.log("Saving data. Err? " + err);
                        });
                    }
                } else {
                    if (!data.members_reg.includes(message.user)) {
                        data.start_counter = data.start_counter + 1;
                        data.members_reg += message.user;
                        console.log("Debug" + "start counter increased" + data.start_counter);
                        controller.storage.channels.save(data, function (err) {
                            if (data.start_counter == 2) {
                                bot.reply(message, "Waiting for one more person to indicate ready to start.");
                            }
                            console.log("Saving data. Err? " + err);
                        });
                    }
                }
                if (data.start_counter == 3) {
                    console.log("Debug" + "start counter == 3");
                    data.start_counter = 0;
                    data.members_reg = '';
                    controller.storage.channels.save(data, function (err) {
                        console.log("Saving data. Err? " + err);
                        if (err) throw err;
                        start();
                    });
                }
            } else if (process.env.condition == "manager") {
                // allow only manager in 'manager' condition
                if (message.user == data.manager || message.user == "UAQ49GYQP") {
                    start();
                } else {
                    bot.reply(message, 'Only \<@' + data.manager + '>  can start the tasks.');
                }
            } else {
                start();
            }
        });

        function start() {
            controller.storage.channels.get(message.channel, (err, data) => {

                if (err || !data.images) {
                    // we only want to start ONCE. Check if no data exists in channel yet

                    // reorder images and store as local variable
                    controller.storage.channels.get(message.channel, (err, data) => {
                        if (err || !data.images) {
                            console.log("Error or no data yet, lets create : " + err);
                            data = {
                                id: message.channel,
                                images: '',
                                revote: ''
                            };
                        }

                        data.images = images.sort(function (a, b) {
                            return 0.5 - Math.random()
                        });
                        data.revote = false;

                        controller.storage.channels.save(data, function (err) {
                            if (err) throw err;
                            // votes_cast = 0;
                            if (process.env.condition == "team") {
                                // We want all participants to say 'start' in team condition before we proceed
                                // start_counter++;
                                // if (start_counter == 3) {
                                // start_counter = 0;
                                getImage(0, bot, message, controller);
                                // }
                            } else if (process.env.condition == "manager") {
                                // allow only manager in 'manager' condition
                                if (message.user == data.manager || message.user == "UAQ49GYQP") {
                                    getImage(0, bot, message, controller);
                                } else {
                                    bot.reply(message, 'Only \<@' + data.manager + '>  can start the tasks.');
                                }
                            } else {
                                getImage(0, bot, message, controller);
                            }
                        });
                    });
                } else {
                    console.log("Error " + err);

                    var output = '';
                    for (var property in data) {
                        output += property + ': ' + data[property] + '; ';
                    }
                }
            });
        }
    });

    controller.hears(['next'], 'direct_message,direct_mention', function (bot, message) {
        controller.storage.channels.get(message.channel, (err, data) => {
            if (err) console.log("Error! : " + err);
            // now save the updated value
            if (typeof data.ongoing == 'undefined') {
                data.ongoing = false;
            }
            if (typeof data.counter == 'undefined') {
                data.counter = 0;
            }
            controller.storage.channels.save(data, function (err) {
                if (data.ongoing == false) {
                    if (process.env.condition == "team") {
                        controller.storage.channels.get(message.channel, (err, data) => {
                            // we want all participants to say 'next' in team condition before we proceed
                            // however, only record one next per person (keep track of who has said next)
                            if (typeof data.members_reg == 'undefined') {
                                data.members_reg = '';
                            }
                            if (!data.members_reg.includes(message.user)) {
                                data.members_reg += message.user;

                                if (typeof data.next_counter == 'undefined') {
                                    data.next_counter = 0 + 1;
                                    controller.storage.channels.save(data, function (err) {
                                        console.log("Saving data. Err? " + err);
                                    });
                                } else {
                                    data.next_counter = data.next_counter + 1;
                                    controller.storage.channels.save(data, function (err) {
                                        console.log("Saving data. Err? " + err);
                                    });
                                }
                                if (data.next_counter == 3) {
                                    data.members_reg = '';
                                    data.next_counter = 0;
                                    data.votes_cast = 0;
                                    controller.storage.channels.save(data, function (err) {
                                        if (err) throw err;
                                        getImage(data.counter, bot, message, controller);
                                    });
                                }
                            }
                        });
                    } else if (process.env.condition == "manager") {
                        controller.storage.channels.get(message.channel, (err, data) => {
                            // allow only manager in 'manager' condition
                            if (message.user == data.manager || message.user == "UAQ49GYQP") {
                                data.votes_cast = 0;
                                controller.storage.channels.save(data, function (err) {
                                    if (err) throw err;
                                    getImage(data.counter, bot, message, controller);
                                });
                            } else {
                                bot.reply(message, 'Only \<@' + data.manager + '>  can request the next task.');
                            }
                        });
                    } else {
                        controller.storage.channels.get(message.channel, (err, data) => {
                            if (err || !data) {
                                console.log("Error or no data yet, lets create : " + err);
                                data = {
                                    id: message.channel,
                                    ongoing: '',
                                    votes_cast: ''
                                };
                            }

                            if (err) console.log("Error! : " + err);
                            // now save the updated value
                            if (typeof data.counter == 'undefined') {
                                data.counter = 0 + 1;
                            } else {
                                data.counter = data.counter + 1;
                            }
                            data.votes_cast = 0;

                            var output = '';
                            for (var property in data) {
                                output += property + ': ' + data[property] + '; ';
                            }
                            console.log("Output : " + output);

                            controller.storage.channels.save(data, function (err) {
                                if (err) throw err;
                                data.votes_cast = 0;
                                getImage(data.counter, bot, message, controller);
                            });
                        });
                    }
                }
            });
        });
    });

    controller.hears(['survey'], 'direct_message,direct_mention', function (bot, message) {
        initialiseSurvey(bot, message);
    });

    // User response to image
    controller.on('interactive_message_callback', function (bot, trigger) {
        if (trigger.actions[0].name.match(/^keep$/) || trigger.actions[0].name.match(/^remove/)) {
            controller.storage.channels.get(trigger.channel, (err, data) => {
                if (err || !data) {
                    console.log("Error or no data yet : " + err);
                }

                var output = '';
                for (var property in data) {
                    output += property + ': ' + data[property] + '; ';
                }

                if (typeof data.counter == 'undefined') {
                    data.counter = 0;

                    controller.storage.channels.save(data, function (err) {
                        if (err) throw err;
                        processVote(bot, trigger, controller);
                    });
                } else {
                    processVote(bot, trigger, controller);
                }
            });
        }

        // Completion survey
        if (trigger.actions[0].name.match(/^survey$/)) {
            var survey = {
                "callback_id": "survey-complete",
                "title": "Completion survey",
                "submit_label": "Submit",
                "notify_on_cancel": false,
                "elements": [{
                        "label": "Age",
                        "name": "age",
                        "type": "text",
                        "subtype": "number"
                    },
                    {
                        "label": "Gender",
                        "name": "gender",
                        "type": "text"
                    },
                    {
                        "label": "Income last year?",
                        "name": "income",
                        "type": "select",
                        "options": [{
                                "label": "$0 - $19,999",
                                "value": "0-20"
                            },
                            {
                                "label": "$20,000 - $34,999",
                                "value": "20-35"
                            },
                            {
                                "label": "$35,000 - $49,999",
                                "value": "35-50"
                            },
                            {
                                "label": "$50,000 - $74,999",
                                "value": "50-75"
                            },
                            {
                                "label": "$75,000 - $100,000",
                                "value": "75-100"
                            },
                            {
                                "label": "$100,000+",
                                "value": "100+"
                            }
                        ]
                    },
                    {
                        "label": "Race",
                        "name": "race",
                        "type": "select",
                        "options": [{
                                "label": "African-American",
                                "value": "africanamerican"
                            },
                            {
                                "label": "Asian",
                                "value": "asian"
                            },
                            {
                                "label": "Caucasian",
                                "value": "caucasian"
                            },
                            {
                                "label": "Hispanic",
                                "value": "hispanic"
                            },
                            {
                                "label": "Native American",
                                "value": "nativeamerican"
                            },
                            {
                                "label": "Other",
                                "value": "other"
                            }
                        ]
                    },
                    {
                        "label": "Reflection",
                        "name": "comment",
                        "type": "textarea",
                        "hint": "Provide your reflection on the completed tasks."
                    }
                ]
            }

            var output = '';
            for (var property in trigger) {
                output += property + ': ' + trigger[property] + '; ';
            }
            console.log("Debug : " + output);

            controller.storage.channels.get(trigger.channel, (err, data) => {
                var start_time = 0;
                var output = '';
                for (var property in data) {
                    output += property + ': ' + data[property] + '; ';
                }

                data.start_time = Date.now();

                controller.storage.channels.save(data, function (err) {
                    if (err) throw err;
                    bot.replyWithDialog(trigger.raw_message, survey);
                    survey_triggermessage = trigger.raw_message;
                });
            });
        }
    });

    var survey_triggermessage = null; // Store survey trigger message so we can replace it when completed

    controller.middleware.receive.use(function (bot, message, next) {
        if (message.callback_id == 'vote-test') {
            var reply = {
                text: 'Thank you, vote recorded.',
                "response_type": "ephemeral",
                "replace_original": true
            };
            bot.replyInteractive(message, reply);
        }
        next();
    });

    controller.middleware.receive.use(function validateDialog(bot, message, next) {
        if (message.type == 'dialog_submission') {
            if (message.submission.comment.length < 50) {
                bot.dialogError({
                    "name": "comment",
                    "error": "Please provide some additional reflection."
                });
                return;
            }
        }
        next();
    });

    // Listen for dialog submission
    controller.on('dialog_submission', function (bot, message) {
        // call dialogOk or else Slack will think this is an error
        bot.dialogOk();

        // First want to get the username before we proceed
        bot.api.users.info({
            user: message.user
        }, function (err, response) {
            if (err) {
                bot.say("Error: " + err);
            } else {
                var username = response["user"]["profile"]["real_name"];

                console.log(JSON.stringify(message.submission, null, 4));
                var age = message.submission.age;
                var gender = message.submission.gender;
                var income = message.submission.income;
                var race = message.submission.race;
                var reflection = message.submission.comment;
                var group = message.channel;
                var condition = process.env.condition;

                insertDatabaseSurvey(message, age, gender, income, race, reflection, message.user, username, group, condition, controller);

                var reply = {
                    text: "Thank you for your response, study completed. Please head to Amazon Mechanical Turk to finalise the task. Your unique completion code: " + username + group + ".",
                    "response_type": "ephemeral",
                    "replace_original": true
                };
                bot.replyInteractive(survey_triggermessage, reply);
            }
        });
    });

    controller.hears(['begin'], 'direct_message,direct_mention', function (bot, message) {
        if (process.env.condition == "team") {
            join_team(bot, message);
        } else if (process.env.condition == "manager") {
            join_manager(bot, message);
        } else {
            join_solo(bot, message);
        }
    });

    function join_team(bot, message) {
        bot.startPrivateConversation({
            user: message.user
        }, function (err, convo) {
            if (err) {
                console.log("Error: " + err);
            } else {
                // team1, team2, team3
                var groups = available_groups;
                var group_counter = 0;
                var group_joined = false;

                // We want participants to enter the first available group -- set up this function for that
                var loopGroups = function (arr) {
                    bot.api.groups.info({
                        channel: arr[group_counter]
                    }, (err, response) => {
                        var group = response['group'];
                        var currentGroupSize = group.members.length;

                        if (currentGroupSize < 5 && group_joined == false) {
                            group_joined = true;

                            // Found a suitable group, no need to keep looping (API usage limited)
                            convo.say('You are invited join ' + group.name + '.');
                            bot.api.groups.invite({
                                token: process.env.slack_token,
                                channel: group.id,
                                user: message.user
                            }, function (err, res) {
                                if (err) {
                                    convo.say("groups.invite:something is wrong... err:" + err);
                                } else {
                                    convo.say('Please click ' + group.name + ' in the left menubar to meet your group members and begin task explanation.');
                                }
                                convo.next();
                            });
                            return;
                        }
                        if (group_joined == true) {
                            return;
                        }
                        if (group_counter < arr.length && group_joined == false) {
                            group_counter++;
                            loopGroups(groups);
                        }
                    })
                }
                loopGroups(groups);
            }
        });
    }

    function join_manager(bot, message) {
        bot.startPrivateConversation({
            user: message.user
        }, function (err, convo) {
            if (err) {
                console.log("Error: " + err);
            } else {
                var groups = available_groups;

                var group_counter = 0;
                var group_joined = false;

                // we want participants to enter the first available group -- set up this function for that
                var loopGroups = function (arr) {
                    bot.api.groups.info({
                        channel: arr[group_counter]
                    }, (err, response) => {
                        var group = response['group'];
                        var currentGroupSize = group.members.length;

                        if (currentGroupSize < 5 && group_joined == false) {
                            group_joined = true;

                            // found a suitable group, no need to keep looping (API usage limited)
                            convo.say('You are invited join ' + group.name + '.');
                            bot.api.groups.invite({
                                token: process.env.slack_token,
                                channel: group.id,
                                user: message.user
                            }, function (err, res) {
                                if (err) {
                                    convo.say("groups.invite:something is wrong... err:" + err);
                                } else {
                                    convo.say('Please click ' + group.name + ' in the left menubar to meet your group members and begin task explanation.');
                                }
                                convo.next();
                            });
                            return;
                        }
                        if (group_joined == true) {
                            return;
                        }
                        if (group_counter < arr.length && group_joined == false) {
                            group_counter++;
                            loopGroups(groups);
                        }
                    })
                }
                loopGroups(groups);
            }
        });
    }

    function join_solo(bot, message) {
        bot.startPrivateConversation({
            user: message.user
        }, function (err, convo) {
            if (err) {
                console.log("Error: " + err);
            } else {
                // solo
                var groups = available_groups;
                var group_joined = false;

                groups.forEach(function (item, index, array) {
                    bot.api.groups.info({
                        channel: item
                    }, (err, response) => {
                        var group = response['group'];
                        var currentGroupSize = group.members.length;

                        if (currentGroupSize < 3 && group_joined == false) {
                            group_joined = true;

                            bot.api.groups.invite({
                                token: process.env.slack_token,
                                channel: group.id,
                                user: message.user
                            }, function (err, res) {
                                if (err) {
                                    convo.say("groups.invite:something is wrong... err:" + err);
                                } else {
                                    convo.say('Please click ' + group.name + ' in the left menubar to begin task explanation.');
                                }
                                convo.next();
                            });
                            return;
                        }
                        if (group_joined == true) {
                            return;
                        }
                    })
                });
            }
        });
    }
}

function processVote(bot, trigger, controller) {
    // First want to get the username before we proceed
    bot.api.users.info({
        user: trigger.user
    }, function (err, response) {
        // var username = response["user"]["profile"]["display_name"];
        var username = response["user"]["profile"]["real_name"];

        if (err) {
            bot.say("ERROR :(");
        } else {
            if (process.env.condition == "team" || process.env.condition == "manager") { // team mode     
                controller.storage.channels.get(trigger.channel, (err, data) => {
                    var image = data.images[data.counter];
                    var question_id_loc = data.counter + "-" + image['title'];
                    var output = '';
                    for (var property in trigger) {
                        output += property + ': ' + trigger[property] + '; ';
                    }

                    var output = '';
                    for (var property in data) {
                        output += property + ': ' + data[property] + '; ';
                    }
                    console.log("Output : " + output);

                    if (err || !data) {
                        console.log("Error or no data yet, lets create : " + err);
                        data = {
                            id: trigger.channel,
                            ongoing: '',
                            votes_cast: 0,
                            votes_remove: 0,
                            votes_keep: 0,
                            revote: ''
                            // counter: ''
                        };
                    }

                    if (data.votes_cast == 0) {
                        data.votes_keep = 0;
                        data.votes_remove = 0;
                        controller.storage.channels.save(data, function (err) {
                            if (err) throw err;
                            handleVote(data, bot, trigger, username, question_id_loc, controller);
                        });
                    } else {
                        handleVote(data, bot, trigger, username, question_id_loc, controller);
                    }
                });
            } else { // solo mode
                controller.storage.channels.get(trigger.channel, (err, data) => {
                    var image = data.images[data.counter];
                    var question_id_loc = data.counter + "-" + image['title'];
                    if (err || !data) {
                        console.log("Error or no data yet, lets create : " + err);
                        data = {
                            id: trigger.channel,
                            ongoing: '',
                            votes_cast: ''
                        };
                    }
                    if (trigger.actions[0].name.match(/^keep$/)) {
                        var comment = "";
                        insertDatabase(trigger, "keep", trigger.user, username, question_id_loc, comment, controller);
                        data.votes_cast = 1; // add one vote
                    } else if (trigger.actions[0].name.match(/^remove$/)) {
                        var comment = "";
                        insertDatabase(trigger, "remove", trigger.user, username, question_id_loc, comment, controller);
                        data.votes_cast = 1; // add one vote
                    }
                    if (data.votes_cast == 1) {
                        data.ongoing = false;
                        controller.storage.channels.save(data, function (err) {
                            if (err) throw err;
                            // all have voted - reset votes_cast and get to next image 
                            bot.startConversation(trigger, function (err, convo) {
                                convo.say({
                                    text: 'Please provide your motivation for including or excluding this parameter.'
                                });
                                convo.say({
                                    text: 'When you are ready to proceed, please let me know by saying \'<@' + bot.identity.name + '> next\'.',
                                    delay: 1000
                                });
                                convo.next();
                            });
                        });
                    }
                });
            }
        }
    });
}

function handleVote(data, bot, trigger, username, question_id_loc, controller) {
    var comment = "";

    if (trigger.actions[0].name.match(/^keep$/)) {
        insertDatabase(trigger, "keep", trigger.user, username, question_id_loc, comment, controller);
        data.votes_cast++; // add one vote
        data.votes_keep++; // add one keep vote

        controller.storage.channels.save(data, function (err) {
            if (err) throw err;
            checkVotesCast(data, bot, trigger, controller);
        });
    } else if (trigger.actions[0].name.match(/^remove$/)) {
        insertDatabase(trigger, "remove", trigger.user, username, question_id_loc, comment, controller);
        data.votes_cast++; // add one vote
        data.votes_remove++; // add one remove vote
        controller.storage.channels.save(data, function (err) {
            if (err) throw err;
            checkVotesCast(data, bot, trigger, controller);
        });
    }
}

function checkVotesCast(data, bot, trigger, controller) {

    var output = '';
    for (var property in data) {
        output += property + ': ' + data[property] + '; ';
    }
    console.log("Output : " + output);

    if (data.votes_cast == 3) {
        if (data.revote == true) {
            // This is a revote -- we don't want another discussion, so move to next image
            data.revote = false; // reset revote
            data.counter++;

            // reset
            data.ongoing = false;
            data.votes_cast = 0;
            data.votes_keep = 0;
            data.votes_remove = 0;
            controller.storage.channels.save(data, function (err) {
                if (err) throw err;
                getImage(data.counter, bot, trigger, controller);
            });
        } else {
            bot.startConversation(trigger, function (err, convo) {
                convo.say({
                    text: 'Please discuss your motivation to include or exclude this parameter.'
                });
                if (process.env.condition == "team") {
                    convo.say({
                        text: 'When you are ready to proceed, I need all of you let me know by saying \'<@' + bot.identity.name + '> next\'.',
                        delay: 1000
                    });
                } else if (process.env.condition == "manager") {
                    convo.say({
                        text: '\<@' + data.manager + '> will lead the discussion. When you are ready to proceed, I need your team captain to let me know by saying \'<@' + bot.identity.name + '> next\'.',
                        delay: 1000
                    });
                }
                convo.next();
            });

            // we only want a revote when there was no consensus in the participant votes
            if (data.votes_keep == 3 || data.votes_remove == 3) {
                data.revote = false;
                data.counter++;
            } else {
                data.revote = true;
            }
            // reset
            data.ongoing = false;
            data.votes_cast = 0;
            data.votes_keep = 0;
            data.votes_remove = 0;
            controller.storage.channels.save(data, function (err) {
                if (err) throw err;
            });
        }
    }
}