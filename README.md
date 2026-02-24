# Label Watcher - PDS Moderation powered by labelers

Subscribes to multiple labelers that you set in your [settings.toml](settings.toml.example) along with which labels you would like to watch for. If it sees the label is applied to a user on one of the PDSs you configure it will take an action. Either notify you by email (and/or webhook), or does an auto takedown of the account.

The idea is we have some awesome labelers like [Blacksky's labeler](https://bsky.app/profile/moderation.blacksky.app), [Hailey's Labeler](https://bsky.app/profile/did:plc:saslbwamakedc4h6c5bmshvz), and [skywatch.blue](https://bsky.app/profile/skywatch.blue) that are doing an amazing job of moderating already, but we do not have a way as PDS admins to be able to use these labels in an easy way. The hope is that this gives an easy way to use these resources to help moderate your PDS. Pick your labelers to subscribe to and which labels from it you would like to to watch for. Then set an action like notify to get an email when a label is applied to an account on your PDS, or can even do an auto takedown of the account(beta and recommend trying the notify action first to get a hang of what accounts gets the label you expect).

I think it will be great for PDSs that also run their own labeler to be able to issue a label for takedowns allowing moderates of an org to have the ability to remotely do takedowns with out the need of the PDS admin password. Should also work at catching bot accounts since the labelers have gotten very good at it



# Setup
Got some configs to setup. We use toml to config the PDSs and labelers. There is an example one at [settings.toml.example](./settings.toml.example). Here you can set
- PDSs settings
  - Can set the watch for multiple PDSs
  - An array of email addresses to send the notifications to
  - An optional webhook URL to send notifications to
  - On startup should it query your PDS to find all the active accounts and add them to the watch list
  - Should it subscribe to your PDS to auto pick up new accounts (cursor resume does not work for this since the startup backfill can usually handle most backfills)
  - Admin password. __This is the keys to your PDS so please use this with caution. label watcher does not require this__. But it is needed for auto takedowns.  
- Which labelers and labels
  - Can set multiple labelers
  - Backfill (should mostly be supported in my test and does take a while to run)
  - Which labels and which action to take when it is seen. Can set as many as you want, make sure to match it to the labeler key.

Also have a .env for some shared secrets at [.env.example](.env.example). This sets up

- How to email the notifications. Either via Resend's API or a smtp url like the PDS supports
- Email address the email comes from
- database location
- migrations folder
- logs level


Can use pnpm or npm and run with
```bash
pnpm i
pnpm run start
```
or can use the docker compose file with. This will build and run label-watcher as a docker container. No release image yet.
```bash
docker compose up
```

# How do I find the labeler info?
1. Find a labeler you like. Like [@skywatch.blue](https://bsky.app/profile/skywatch.blue)
2. Resolve it's did doc or use one of the atproto browsers to get the `atproto_labeler` service endpoint. sky watches is `https://ozone.skywatch.blue/` so `ozone.skywatch.blue` is the host
3. Each labeler has a record at `app.bsky.labeler.service` with a rkey of self. Like [here](https://blewit.us-west.host.bsky.network/xrpc/com.atproto.repo.getRecord?repo=did:plc:e4elbtctnfqocyfcml6h2lf7&collection=app.bsky.labeler.service&rkey=self). 
4. The label values are found under policies -> labelValues. We are going to use `bluesky-elder` as an example and set an action of `notify`.

Put it all together it looks like this
```toml
# Define the labeler
[labeler.skywatch]
host = "ozone.skywatch.blue"
# Set if you want to replay labels. Takes a minute, or a few...
# backfillLabels = true

# Notifies if an account has the bluesky-elder label applied
[labeler.skywatch.labels.bluesky-elder]
label_name = "bluesky-elder"
action = "notify"

#Repeat the last one for as many labels as you want
```


# Features

## PDS
- Can backfill and get all active accounts on start up
- Can listen to the PDSs firehose to add new identities as they are created on the PDS
- Does not keep a cursor of the firehose during reboots since it can backfill on start up
- Can set a list of emails to send notifications to of actions taken
- Works for multiple PDSs configured in the settings.toml

## Labeler
- Can subscribe to labels from a labeler. Multiple of each set up in the settings.toml
- Does support backfilling of labels via the cursor on restart so you do not miss any
- Should support full backfill if set 
- Can give each label an action like notify or takedown. It will take the action and send you an email
- Auto takedowns are still new and should expect possible bugs. Takedowns have been reservable in my experience, but I highly recommend to start with notify first and do manual takedowns when needed while you find what labels work.
- During auto takedowns if a label is negated(reversed) the takedown is also reversed


# Future features?
Not sure. Playing around with making a UI possibly, maybe even a multi instance that others can sign up for and not have to host?
