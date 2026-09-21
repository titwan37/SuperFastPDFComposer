# wsl sudo apt update && sudo apt install sshpass -y
# wsl sudo apt list --upgradable
# wsl ANSIBLE_CONFIG=./ansible.cfg ansible-playbook -i inventory.ini deploy.yml -k -u root
wsl ANSIBLE_CONFIG=./ansible.cfg ansible-playbook -i inventory.ini deploy.yml --private-key=~/ionos_sec_ed25519