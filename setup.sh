#!/bin/bash
# -------- install openthread if not available -------- 
# needed for thread_tags
if [ -x "$(command -v ot-ctl)" ]; then
    echo "openthread available"
else
    echo "Installing openthread"
    sudo bash setup_border_router.sh
    SCRIPT_REBOOT="yes"
fi

if [ "$SCRIPT_REBOOT" = "yes" ]; then
    echo "rebooting now - please run 'sudo sh setup.sh' again after reboot"
    sudo reboot now
fi

sudo bash setup_thread_services.sh
