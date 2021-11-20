#!/bin/bash
pushd ~
git clone https://github.com/openthread/ot-br-posix
cd ot-br-posix
./script/bootstrap
INFRA_IF_NAME=eth0 ./script/setup
#config in /etc/default/otbr-agent `OTBR_WEB_OPTS="-p 8020"`
#config in /etc/wpantund.conf
popd
