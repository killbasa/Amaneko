---
title: Cameo
---

# Cameo <Badge type='tip' text='Slash command' />

Start or stop sending a streamer's cameos.

## /cameo add

Add a cameo subscription to this channel.

| Option  | Required | Autocomplete | Description                      |
| ------- | :------: | :----------: | :------------------------------- |
| Channel |    ✓     |      ✓       | The name of the YouTube channel. |

## /cameo remove

Remove a cameo subscription from this channel.

| Option       | Required | Autocomplete | Description                                |
| ------------ | :------: | :----------: | :----------------------------------------- |
| Subscription |    ✓     |      ✓       | The name of the YouTube channel to remove. |

## /cameo clear

Remove all cameo subscriptions from a channel.

::: info
If no Discord channel is provided, it will default to the channel that the command is run in.
:::

| Option          | Required | Autocomplete | Description                                    |
| --------------- | :------: | :----------: | :--------------------------------------------- |
| Discord channel |    ✕     |      ✕       | The channel to clear cameo subscriptions from. |

## /cameo list

List all of the cameo subscriptions in the server.
