var debug = require('debug')('botkit:channel_join');

module.exports = function (controller) {
    controller.on('bot_channel_join', function (bot, message) {
        controller.studio.run(bot, 'channel_join', message.user, message.channel, message).catch(function (err) {
            debug('Error: encountered an error loading onboarding script from Botkit Studio:', err);
        });
    });

    // person joins team
    controller.on('team_join', function (bot, message) {
        // start a conversation to handle this response.
        bot.startPrivateConversation({ user: message.user.id }, function (err, convo) {
            if (err) {
                console.log("Error: " + err);
            }
            else {
                convo.say('When ready to start, type \'\<@' + bot.identity.name + '> begin\'.');
            }
        });
    });
}
