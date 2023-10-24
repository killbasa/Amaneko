---
title: YouTube
---

# YouTube <Badge type='tip' text='Slash command' />

Manage YouTube livestream notifications.

## /youtube subscribe

Add a YouTube livestream notification to a channel.

| Option  | Required | Autocomplete | Description                         |
| ------- | :------: | :----------: | :---------------------------------- |
| Channel |    ✓     |      ✓       | The name of the YouTube channel.    |
| Role    |    ✕     |      ✕       | The role to ping for notifications. |

## /youtube unsubscribe

Remove a YouTube channel's livestream notification.

| Option       | Required | Autocomplete | Description                                |
| ------------ | :------: | :----------: | :----------------------------------------- |
| Subscription |    ✓     |      ✓       | The name of the YouTube channel to remove. |

## /youtube member subscribe

Add a YouTube member livestream notification to a channel.

| Option  | Required | Autocomplete | Description                         |
| ------- | :------: | :----------: | :---------------------------------- |
| Channel |    ✓     |      ✓       | The name of the YouTube channel.    |
| Role    |    ✕     |      ✕       | The role to ping for notifications. |

## /youtube member unsubscribe

Remove a YouTube channel's member livestream notification.

| Option       | Required | Autocomplete | Description                                |
| ------------ | :------: | :----------: | :----------------------------------------- |
| Subscription |    ✓     |      ✓       | The name of the YouTube channel to remove. |

## /youtube clear

Remove all YouTube livestream notifications from a channel.

::: info
If no Discord channel is provided, it will default to the channel that the command is run in.
:::

| Option          | Required | Autocomplete | Description                                                 |
| --------------- | :------: | :----------: | :---------------------------------------------------------- |
| Discord channel |    ✕     |      ✕       | The channel to clear YouTube livestream notifications from. |

## /youtube list

List all YouTube livestream notifications in the server.
