---
title: Relay
---

# Relay <Badge type='tip' text='Slash command' />

Start or stop relaying a streamer's translations.

## /relay add

Add a relay subscription to this channel.

| Option  | Required | Autocomplete | Description                      |
| ------- | :------: | :----------: | :------------------------------- |
| Channel |    ✓     |      ✓       | The name of the YouTube channel. |

## /relay remove

Remove a relay subscription from this channel.

| Option       | Required | Autocomplete | Description                                |
| ------------ | :------: | :----------: | :----------------------------------------- |
| Subscription |    ✓     |      ✓       | The name of the YouTube channel to remove. |

## /relay settings

Enable or disable translations and moderator messages.

::: info
Providing no options will show the current settings.
:::

| Option       | Required | Autocomplete | Description                           |
| ------------ | :------: | :----------: | :------------------------------------ |
| Moderators   |    ✕     |      ✕       | Enable or disable moderator messages. |
| Translations |    ✕     |      ✕       | Enable or disable translations.       |

## /relay clear

Clear all relay subscriptions in this channel.

::: info
If no Discord channel is provided, it will default to the channel that the command is run in.
:::

| Option          | Required | Autocomplete | Description                                    |
| --------------- | :------: | :----------: | :--------------------------------------------- |
| Discord channel |    ✕     |      ✕       | The channel to clear relay subscriptions from. |

## /relay list

List all of the relay subscriptions in the server.
