# Label Watcher

>WIP: Will share with a few people, and ofc it's public if you are reading this. But going run locally before telling the whole atmosphere about it and make a docker container


Does what it says. Watches for labels. Okay really it watches for labelers and labels you set. And if it sees a  label applied to an account on the PDS it notifies you via email. And will one day do auto take downs as well.

The idea is we have some awesome labelers like [skywatch.blue](https://bsky.app/profile/skywatch.blue) and [Hailey's Labeler](https://bsky.app/profile/did:plc:saslbwamakedc4h6c5bmshvz) that are doing an amazing job of catching troubled accounts that PDS admins may want to know if they are doing these things on their PDS. This gives an easy way to use these resources to help moderate your PDS. And once auto takedowns are added I think it will be great for PDSs that also run their own labeler to be able to issue takedowns from a manual label added via ozone.





# Setup
Got some configs to setup. Use toml to set it up and have an example one at [settings.toml.example](./settings.toml.example). Here you can set
- Which PDSs to follow
- Which labelers and labels

Also have a .env for some shared secrets at [.env.example](.env.example)


Can use pnpm or npm and just do
```bash
pnpm i
pnpm run start
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
- Will support full backfill at some point 
- Can give each label an action like notify or takedown (will come later). It will take the action and send you an email
