from telegram.ext import Updater, CommandHandler
import json

def hello(update, context):
    print(f"got message from {update.message.from_user.first_name}")
    update.message.reply_text(
        'Hello {}'.format(update.message.from_user.first_name))


token = json.load(open("secret.json"))["bots"]["smart_hover_bot"]["token"]

updater = Updater(token, use_context=True)
updater.dispatcher.add_handler(CommandHandler('hello', hello))



updater.start_polling()
updater.idle()
