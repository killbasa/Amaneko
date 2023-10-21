---
title: Community post
---

# Community post <Badge type='tip' text='Slash command' />

Manage YouTube community post notifications.

## /community add

Add a community post subscription to this channel.

| Option  | Required | Autocomplete | Description                         |
| ------- | :------: | :----------: | :---------------------------------- |
| Channel |    ✓     |      ✓       | The name of the YouTube channel.    |
| Role    |    ✕     |      ✕       | The role to ping for notifications. |

## /community remove

Remove a community post subscription.

| Option       | Required | Autocomplete | Description                                |
| ------------ | :------: | :----------: | :----------------------------------------- |
| Subscription |    ✓     |      ✓       | The name of the YouTube channel to remove. |

## /community clear

Remove all community post subscriptions from a channel.

::: info
If no Discord channel is provided, it will default to the channel that the command is run in.
:::

| Option          | Required | Autocomplete | Description                                             |
| --------------- | :------: | :----------: | :------------------------------------------------------ |
| Discord channel |    ✕     |      ✕       | The channel to clear community post subscriptions from. |

## /community list

List all of the community post subscriptions in the server.
