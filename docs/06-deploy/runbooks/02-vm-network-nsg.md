# 런북 02 — VM · 네트워크 · 방화벽(NSG)

## 이번에 배울 것

| 개념 | 한 줄 정의 | MS Learn |
|---|---|---|
| IaaS | 서버(VM)를 빌리고 OS부터 위는 내가 관리하는 모델 | 클라우드 개념 › 클라우드 서비스 유형 |
| Virtual Machine | 클라우드의 가상 서버. 크기(vCPU · 메모리)를 골라 과금 | 컴퓨팅 서비스 |
| VNet · 서브넷 | VM이 속하는 사설 네트워크 | 네트워킹 서비스 |
| 공용 IP · DNS 레이블 | 인터넷에서 VM에 닿는 주소와 무료 도메인 이름 | 네트워킹 서비스 |
| NSG | 포트 단위로 들어오고 나가는 트래픽을 허용 · 차단하는 방화벽 규칙 | 네트워킹 서비스 |
| 관리 디스크 | VM의 OS 디스크. VM을 멈춰도 남고, 디스크는 따로 과금 | 스토리지 서비스 |

## 왜 하는가

nginx와 API를 올릴 서버가 필요하다. 웹 트래픽(80 · 443)만 열고, 관리 접속(22, SSH)은 **내 IP에서만** 허용해야 무작위 로그인 공격을 막을 수 있다.

## 실행

### 1. 크기 고르기

```powershell
az vm list-sizes --location koreacentral -o table | Select-String "B1s|B2ats_v2|B2s"
```

| 후보 | 사양 | 메모 |
|---|---|---|
| `Standard_B1s` | 1 vCPU · 1 GiB | 가장 저렴. 컨테이너 2개 실행은 충분하고, VM에서 빌드할 때는 스왑 2GB를 켜서 쓴다 (런북 03 · 04) |
| `Standard_B2ats_v2` | 2 vCPU · 1 GiB | 버스트형 |
| `Standard_B2s` | 2 vCPU · 4 GiB | 여유 있음, 비용 높음 |

무료 혜택에 포함되는 크기는 **본인 구독의 혜택 안내**에서 확인하고 고른다. 이 런북은 `Standard_B1s`로 쓴다.

### 2. 내 공인 IP 확인

```powershell
$MYIP = (Invoke-RestMethod https://api.ipify.org)
$MYIP
```

### 3. VM 만들기

```powershell
az vm create `
  --resource-group rg-cheongdo-course `
  --name vm-cheongdo-course `
  --location koreacentral `
  --image Ubuntu2404 `
  --size Standard_B1s `
  --admin-username azureuser `
  --generate-ssh-keys `
  --public-ip-sku Standard `
  --public-ip-address-dns-name cheongdo-course-<이니셜> `
  --os-disk-size-gb 30 `
  --storage-sku StandardSSD_LRS `
  --nsg-rule NONE `
  --tags project=cheongdo-course env=prod
```

- `--generate-ssh-keys`: `~/.ssh/id_rsa`(개인 키)가 없으면 새로 만들고 공개 키를 VM에 넣는다. **개인 키는 절대 공유 · 커밋 금지.**
- `--nsg-rule NONE`: 기본 규칙을 만들지 않고 아래에서 직접 만든다 (무엇이 열려 있는지 정확히 알기 위해).
- `Ubuntu2404` 별칭이 없다고 나오면 `az vm image list --publisher Canonical --offer ubuntu-24_04-lts --all -o table`로 이미지 URN을 찾아 쓴다.

출력의 `publicIpAddress`, `fqdn`을 확인해 둔다 (런북 04에서 접속 주소로 쓴다).

### 4. NSG 규칙

```powershell
$NSG = az network nsg list -g rg-cheongdo-course --query "[0].name" -o tsv

az network nsg rule create -g rg-cheongdo-course --nsg-name $NSG `
  --name allow-ssh-myip --priority 100 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 22 --source-address-prefixes "$MYIP/32"

az network nsg rule create -g rg-cheongdo-course --nsg-name $NSG `
  --name allow-http --priority 110 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 80 --source-address-prefixes Internet

az network nsg rule create -g rg-cheongdo-course --nsg-name $NSG `
  --name allow-https --priority 120 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 443 --source-address-prefixes Internet
```

> 집 · 학교 등 장소가 바뀌어 IP가 바뀌면 `allow-ssh-myip` 규칙의 원본 주소를 갱신해야 SSH가 된다.
> 22번은 내 IP에서만 연다. 이 프로젝트는 CI/CD를 쓰지 않으므로 다른 곳에 열 필요가 없다.

### 5. 리소스 둘러보기 (포털)

포털 → `rg-cheongdo-course`에 생긴 리소스를 하나씩 열어 본다: 가상 머신, 디스크, 네트워크 인터페이스, 공용 IP 주소, 네트워크 보안 그룹, 가상 네트워크.

## 확인

```powershell
az vm show -d -g rg-cheongdo-course -n vm-cheongdo-course --query "{state:powerState, ip:publicIps, fqdn:fqdns}" -o table
az network nsg rule list -g rg-cheongdo-course --nsg-name $NSG -o table
```

- 상태 `VM running`, FQDN `cheongdo-course-xx.koreacentral.cloudapp.azure.com`
- NSG 규칙 3개 (22는 내 IP만)

## 이해 점검

1. VM 하나를 만들었는데 리소스가 6개쯤 생겼다. 각각 무엇이고 왜 필요한가?
2. IaaS에서 Azure가 책임지는 것과 내가 책임지는 것은? (공동 책임 모델)
3. NSG에서 우선순위 숫자가 작을수록 먼저 적용된다. 모든 트래픽을 막는 기본 규칙은 어디에 있나?
4. 22번 포트를 `Internet` 전체에 열면 어떤 일이 생길 수 있나?

## 정리 · 비용

이제부터 VM이 켜져 있는 동안 과금된다. 실습을 멈출 때:

```powershell
az vm deallocate -g rg-cheongdo-course -n vm-cheongdo-course   # 컴퓨팅 과금 중지 (디스크 · 공용 IP는 계속 과금)
az vm start -g rg-cheongdo-course -n vm-cheongdo-course        # 다시 시작
```

Standard 공용 IP는 고정이라 재시작해도 주소 · FQDN이 유지된다.
