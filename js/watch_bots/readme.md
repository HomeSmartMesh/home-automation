# Intro
Telegram node.js client
https://github.com/telegraf/telegraf

# Install
    npm init

# steps
* chat with botfather /newbot
* click on botfathers bot link to chet with it
* send many messages required to trigger the api response
* https://api.telegram.org/bot<YourBOTToken>/getUpdates

# Config
`mqtt.lists` is a map grouping sensors into lists
`watch` is a map where each list has a sensor name which matching a message field
* `minimum` will trigger a comparision check and an alert when below the given value
* `alive_minutes_sensor` checks each sensor topic independently to be more lively than the given time
* `alive_minutes_list` cheks all sensors together from the given list where any would keep it alive
