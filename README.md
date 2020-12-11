# secretctl-cli
> CLI tool for managing secrets.

# Features
- Generates random secrets.
- Generates random k8s secret keys.
- Gets k8s secret keys.
- Encodings:
  - `htpasswd-sha1`
  - `base64`

## Install

```sh
npm i -g @swordev/secretctl-cli
```

## Usage

```
Usage: npx secretctl [options] [command]

Options:
  -h, --help                display help for command

Commands:
  gen [options]             Generates secret
  kube-gen [options]        Generates kubernetes secret keys
  kube-check-gen [options]  Checks generated kubernetes secret keys
  kube-get-gen [options]    Gets generated kubernetes secret keys
  kube-get [options]        Gets secret keys
  help [command]            display help for command
```

## Examples

### Generates secret

```sh
$ npx secretctl gen
**********
```

### Generates kubernetes secret key

```yml
apiVersion: v1
kind: Secret
metadata:
  name: sample
  annotations:
    git.io/gen-secret: key1
type: Opaque
```

```sh
$ kubectl apply -f secret.yml
secret/sample unchanged
$ npx secretctl kube-gen
? Run 'kubectl patch secret sample --type merge --patch {"data":{"key1":"**********"}}?' (y/n): y
secret/sample patched
```

### Checks generated kubernetes secret keys

```sh
$ secretctl kube-check-gen
✓ sample/key1
```
### Gets generated kubernetes secret keys

```sh
$ secretctl kube-get-gen -s
sample/key1
**********
```

### Gets kubernetes secret keys

```sh
$ secretctl kube-get -s
default-token-zgsj6/ca.crt
**********
default-token-zgsj6/namespace
**********
default-token-zgsj6/token
**********
sample/key1
**********
```