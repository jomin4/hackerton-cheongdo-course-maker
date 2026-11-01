# 관광지 데이터 출처 조사

> 조사일(접속일): **2026-10-31**. 시간에 따라 바뀌는 값(건수 · 운영시간 · 수정일)은 모두 이 날짜 기준이다.
> 공개 페이지만 읽었다. 회원가입 · 서비스 키 발급 · 로그인 필요한 파일 다운로드는 하지 않았다.
> 관련 문서: [`spots-data.md`](./spots-data.md) · [`../03-architecture/data-model.md`](../03-architecture/data-model.md)
>
> **결론 (2026-11-01)**: TourAPI는 오프라인 조사 도구로만 쓰고, 확인한 사실 · 직접 쓴 문장 · 1유형 사진 URL만 저장하기로 했다 → [ADR 0005](../00-overview/decisions/0005-day-plan-coordinates-hours.md). 아래 "미결 사항"은 조사 당시 기록이다.

## 요약 (권장안)

1. **텍스트(이름 · 주소 · 소개) · 좌표**: 한국관광공사 TourAPI `KorService2`를 쓴다. 청도군 133건 전부 좌표와 개요가 있고, 법정동 코드(경북 `47` / 청도군 `820`)로 걸러 받을 수 있다.
2. **운영 정보(시간 · 휴무 · 요금 · 문의)**: TourAPI `detailIntro2` + `detailInfo2`(요금)를 1차 값으로 쓰되, 출처 간 불일치가 있어 `checkedAt` 규칙대로 장소 공식 홈페이지 · 청도군 문화관광으로 교차 확인한다.
3. **사진**: TourAPI 이미지 중 `cpyrhtDivCd=Type1`(공공누리 1유형)만 쓴다. 부족한 장소(운문사 등)는 관광사진 갤러리(포토코리아, 1유형) 사진으로 채운다. 청도군 누리집 사진은 공공누리 표시가 없어 협의 전에는 쓰지 않는다.
4. **빈 곳**: 운문사는 TourAPI 관광정보 검색에서 찾지 못했다. 텍스트는 청도군 문화관광 · 운문사 공식 정보로 따로 확인해야 한다.
5. **설계 전 결정 필요**: 한국관광콘텐츠랩 저작권 정책에 **"콘텐츠 캐싱(로컬서버 저장방식) 금지"** 조항이 있다. TourAPI 데이터를 DB에 저장하려면 이 조항부터 해결해야 한다([미결 사항 1](#미결-사항-소유자-결정)).

---

## 1. 한국관광공사 TourAPI — 국문 관광정보 서비스 (KorService2)

### 버전 · 기본 정보

| 항목 | 값 | 출처 |
|---|---|---|
| 데이터셋 | 한국관광공사_국문 관광정보 서비스_GW (15101578) | [data.go.kr](https://www.data.go.kr/data/15101578/openapi.do) |
| 엔드포인트 | `https://apis.data.go.kr/B551011/KorService2` | 같은 페이지 |
| 규모 | 15종 기능, 약 26만 건, 국문 | 같은 페이지 |
| 등록 / 수정일 | 2022-06-24 / 2026-02-26 | 같은 페이지 |
| 형식 | REST, XML 기본 · `_type=json`으로 JSON | 같은 페이지 |
| 공통 필수 파라미터 | `serviceKey`, `MobileOS`, `MobileApp` | 같은 페이지(Swagger 명세) |
| 브랜드 | 관리 사이트 이름 "TourAPI4.0" / 한국관광콘텐츠랩 | [api.visitkorea.or.kr](https://api.visitkorea.or.kr/#/useServiceGuide/1) |

- 현재 운영 버전은 오퍼레이션 이름 끝이 `2`인 `KorService2`다. 상세 매뉴얼(`개방데이터_활용매뉴얼(국문).zip`)은 내려받지 않아 매뉴얼 버전 번호는 **확인 못 함**.
- data.go.kr 명세가 가리키는 "법정동코드 · 신분류코드 안내" 공지([no=207](https://api.visitkorea.or.kr/#/cmsNoticeDetail?no=207))는 접속 시 "유효하지 않은 공지 입니다"가 뜬다.

### 우리에게 필요한 오퍼레이션

출처: [data.go.kr 15101578 Swagger 명세](https://www.data.go.kr/data/15101578/openapi.do)

| 오퍼레이션 | 이름 | 용도 |
|---|---|---|
| `areaBasedList2` | 지역기반 관광정보조회 | 청도군 목록 (법정동 · 타입 · 수정일 필터) |
| `locationBasedList2` | 위치기반 관광정보조회 | 좌표 + 반경(최대 20km) 주변 목록 |
| `searchKeyword2` | 키워드 검색 조회 | 이름으로 찾기 |
| `detailCommon2` | 공통정보조회 | 개요 · 주소 · 좌표 · 대표이미지 · 홈페이지 · 전화 |
| `detailIntro2` | 소개정보조회 | 이용시간 · 쉬는날 · 문의 · 주차 등 (타입별 필드) |
| `detailInfo2` | 반복정보조회 | 입장료 등 추가 항목 (`infoname` / `infotext`) |
| `detailImage2` | 이미지정보조회 | 추가 이미지 + 공공누리 유형 |
| `areaBasedSyncList2` | 관광정보 동기화 목록 조회 | `showflag`(표출 여부) · `modifiedtime`으로 변경분 동기화 |
| `ldongCode2` | 법정동코드조회 | 시도 · 시군구 코드 |
| `lclsSystmCode2` | 분류체계 코드조회 | 신분류 1~3 Depth |
| `detailPetTour2` | 반려동물 동반 여행 정보 | (선택) |
| `searchFestival2` / `searchStay2` | 행사 / 숙박 | MVP 범위 밖 |
| `areaCode2` / `categoryCode2` | 지역 · 서비스분류 코드 | **미사용 (삭제 예정)** |

### 지역 코드 체계 변경

- `areaCode` · `sigunguCode` · `cat1~3`은 명세에 "미사용항목(삭제예정)"으로 표시되어 있다. 대신 `lDongRegnCd`(법정동 시도) · `lDongSignguCd`(법정동 시군구, `lDongRegnCd` 필수)와 `lclsSystm1~3`(분류체계)을 쓴다. ([data.go.kr](https://www.data.go.kr/data/15101578/openapi.do))
- **경상북도 청도군 = `lDongRegnCd=47`, `lDongSignguCd=820`**. 한국관광콘텐츠랩의 관광 콘텐츠 통합 검색 화면이 쓰는 법정동 지역 목록에서 확인했다("경상북도" `47`, "청도군" `820`). ([콘텐츠랩 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch)) `ldongCode2`를 직접 호출한 값은 아니다.
- 참고로 구 체계 값은 `areaCode=35`, `sigunguCode=20`이다. 대한민국 구석구석 상세 데이터에 이 값이 함께 나온다. ([구석구석 와인터널](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=79f47ce4-1956-408f-a9a2-54a50cdfb05c))

### 콘텐츠 타입 (contentTypeId)

출처: [data.go.kr 명세](https://www.data.go.kr/data/15101578/openapi.do)

| ID | 타입 | 청도군 건수* |
|---|---|---|
| 12 | 관광지 | 54 |
| 14 | 문화시설 | 4 |
| 15 | 축제공연행사 | 0 |
| 25 | 여행코스 | 0 |
| 28 | 레포츠 | 35 |
| 32 | 숙박 | 5 |
| 38 | 쇼핑 | 4 |
| 39 | 음식점 | 31 |
| | **합계** | **133** |

\* 한국관광콘텐츠랩 [관광 콘텐츠 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch)의 국문 관광정보, 지역 경북 · 청도군 필터 결과(2026-10-31). 133건 모두 좌표와 개요가 있고, 대표이미지는 115건에 있다. 이 화면의 전국 건수(49,659건)가 data.go.kr 표기(약 26만 건)와 다르므로, `areaBasedList2`의 `totalCount`와 같은지는 **확인 못 함**. 행사 0건도 API 기준인지 **확인 못 함**.

### 필드 위치

출처: [data.go.kr 명세](https://www.data.go.kr/data/15101578/openapi.do) 응답 항목

| 필요한 값 | 필드 | 받는 곳 |
|---|---|---|
| 좌표 | `mapx`(경도) · `mapy`(위도), WGS84 | 목록 4종 · `detailCommon2` · `areaBasedSyncList2` |
| 대표이미지 | `firstimage`(원본, 약 500×333) · `firstimage2`(썸네일, 약 150×100) + `cpyrhtDivCd` | 목록 · `detailCommon2` |
| 추가 이미지 | `originimgurl` · `smallimageurl` · `imgname` · `cpyrhtDivCd` | `detailImage2` |
| 개요 | `overview` | `detailCommon2`만 |
| 주소 | `addr1` · `addr2` · `zipcode` | 목록 · `detailCommon2` |
| 이용시간 | `usetime`(12) · `usetimeculture`(14) · `usetimeleports`(28) · `opentime`(38) · `opentimefood`(39) | `detailIntro2` |
| 쉬는날 | `restdate`(12) · `restdateculture`(14) · `restdateleports`(28) · `restdateshopping`(38) · `restdatefood`(39) | `detailIntro2` |
| 요금 | `usefee`(14) · `usefeeleports`(28). **관광지(12)는 요금 필드가 없다** → `detailInfo2`의 `infoname="입장료"` 행 | `detailIntro2` / `detailInfo2` |
| 문의 | `infocenter`(12) · `infocenterculture`(14) · `infocenterleports`(28) 등, 그리고 `tel` · `telname` | `detailIntro2` / `detailCommon2` |
| 홈페이지 | `homepage` (HTML 링크 포함) | `detailCommon2` |
| 변경 추적 | `modifiedtime`, `showflag`, `oldContentid` | `areaBasedSyncList2` |

관찰한 점 (아래 표본 10곳 기준):
- 표본 전부 `tel`이 비어 있고 전화번호는 `infocenter*`에 있었다. ([콘텐츠랩 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch))
- 관광지(12)의 입장료는 반복정보(`입장료` 항목)로만 나왔다. 구석구석 상세 화면도 이 반복정보를 "입장료"로 보여 준다. ([구석구석 청도읍성](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=341cb1e6-77b0-4d6b-895c-a13febe809d9))
- 운영 정보는 자유 텍스트다(예: `- 평일 09:30~18:00 (퇴장 시간 17:45)- 주말 09:30~19:00`). `OpeningHours`의 `weekday`/`weekend`로 자동 분리하기 어렵다.

### 서비스 키 · 트래픽

| 항목 | 값 | 출처 |
|---|---|---|
| 발급 절차 | 공공데이터포털 회원가입 → 개발계정 활용신청 → 서비스 키 자동 발급 → (운영 시) 운영계정 신청 | [콘텐츠랩 OpenAPI 이용 안내](https://api.visitkorea.or.kr/#/useServiceGuide/1) |
| 승인 | 개발단계 **자동승인** / 운영단계 **심의승인** | [data.go.kr](https://www.data.go.kr/data/15101578/openapi.do) |
| 일일 트래픽 | 개발계정 **1,000건** / 운영계정 "활용사례 등록시 신청하면 트래픽 증가 가능" | 같은 페이지 |
| 운영계정 승인 요건 | 개발계정 테스트 로그, `MobileApp` 값의 서비스 고유명, 서비스에서 한국관광공사 OpenAPI 활용 | [콘텐츠랩 OpenAPI 이용 안내](https://api.visitkorea.or.kr/#/useServiceGuide/1) |
| 키 | 1인 1개, 포털의 모든 OpenAPI에 공용, 재발급 시 기존 키 폐기 | 같은 페이지 |

운영계정의 트래픽 상한 수치는 **확인 못 함**.

### 라이선스

| 대상 | 조건 | 출처 |
|---|---|---|
| 데이터셋 | 이용허락범위 "제한 없음", 무료 | [data.go.kr](https://www.data.go.kr/data/15101578/openapi.do) |
| 텍스트 | "저작권 등에 구애 없이 자유롭게 활용 가능한 정보만을 선별"해 제공 | 같은 페이지(명세 설명) |
| 이미지 | 공공누리 **1유형 · 3유형** 이미지 제공. 이미지마다 `cpyrhtDivCd` = `Type1`(출처표시) / `Type3`(출처표시 + 변경금지) | 같은 페이지 |
| 사진 금지 용도 | 피사체 명예훼손 · 인격권 침해 등 일반 정서에 반하는 용도, 기업 CI · BI | 같은 페이지 |
| 출처 표기 · 캐싱 | [라이선스 섹션](#라이선스-및-출처-표기) 참고 | [콘텐츠랩 저작권 정책](https://api.visitkorea.or.kr/#/useServiceGuide/2) |

---

## 2. 청도 표본 10곳 필드 커버리지

조사 방법: API를 호출하지 않았다. 대신 (1) 한국관광공사가 운영하는 [한국관광콘텐츠랩 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch) 화면이 보여 주는 관광정보(TourAPI와 같은 `contentId` · 필드명 체계)와 (2) [대한민국 구석구석](https://korean.visitkorea.or.kr) 여행지 상세 페이지를 읽었다.

표기: ✅ 있음 · △ 불완전 · ❌ 없음

| 장소 | contentId (타입) | 주소 | 좌표 | 사진 | 개요 | 이용시간 | 요금 | 휴무 | 문의 | 구석구석 페이지 |
|---|---|---|---|---|---|---|---|---|---|---|
| 청도 와인터널 | 2660803 (12) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 무료 | ✅ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=79f47ce4-1956-408f-a9a2-54a50cdfb05c) |
| 청도 레일바이크 | 2729978 (28) | △ 지번 | ✅ | ✅ | ✅ | ✅ | ✅ | △ "월마다 상이" | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=d00a09f0-5922-4b43-8d62-565da34a966b) |
| 운문사 | 찾지 못함 | ❌ | ❌ | △ 고품질사진만 | ❌ | ❌ | ❌ | ❌ | ❌ | 찾지 못함 |
| 청도읍성 | 1621437 (12) | △ "화양읍 동상리" | ✅ | ✅ | ✅ | ✅ 상시 개방 | ✅ 무료 | ❌ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=341cb1e6-77b0-4d6b-895c-a13febe809d9) |
| 유등연지 | 1621347 (12) | ✅ | ✅ | ✅ | ✅ | ✅ 상시 개방 | ✅ 무료 | ✅ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=906b1962-1889-43f6-84ae-87636efcf61b) |
| 청도 프로방스 | 2729992 (12) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=dbf9ae5e-29f4-4ee8-ac40-c0e1688b8503) |
| 청도박물관 | 2753371 (14) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 확인 못 함 |
| 청도소싸움미디어체험관 (테마파크) | 3444315 (12) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [테마파크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=c91aff54-7ab0-48d4-a1a0-2579042765be) · [체험관](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=326ed960-b026-4c37-b558-05542b2dc0da) |
| 낙대폭포 | 4072338 (12) | ✅ 산지번 | ✅ | ✅ | ✅ | ✅ 상시 개방 | ✅ 무료 | ✅ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=e7a1b105-0ad2-4312-b489-b442a2871e23) |
| 청도신화랑풍류마을 | 2663350 (12) | ✅ | ✅ | ✅ | ✅ | ✅ | △ VR체험존만 | ✅ | ✅ | [링크](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=ba2128c2-0402-4490-8e4a-37a8bd708551) |

표본 값 (2026-10-31 기준, 콘텐츠랩 관광정보):

| 장소 | 이용시간 | 요금 | 휴무 | 문의 |
|---|---|---|---|---|
| 와인터널 | 평일 09:30~18:00(퇴장 17:45) / 주말 09:30~19:00(퇴장 18:45) | 입장료 무료 | 연중무휴 | 054-371-1904 |
| 레일바이크 | 09:00~17:00 (3·4·5·6·9·10월 주말 18:00) | 2인승 25,000원 · 3인승 29,000원 · 4인승 33,000원 (구석구석) | 월마다 상이, 홈페이지 참조 | 054-373-2426 |
| 청도읍성 | 상시 개방 | 무료 | — | 054-370-6062 |
| 유등연지 | 상시 개방 | 무료 | 연중무휴 | 화양읍사무소 054-370-6702 |
| 프로방스 | 16:00~22:00 | 입장권 10,900~12,900원 | 연중무휴 | 054-372-5050 |
| 청도박물관 | 09:00~18:00(입장 마감 17:30) | 무료(일부 기획 · 대관전시 유료) | 매주 월, 1/1, 설 · 추석 당일 | 054-370-2281 |
| 소싸움미디어체험관 | 3~11월 09:30~17:30 / 12~2월 09:30~17:00 | 일반 3,000원 · 청소년 · 어린이 2,000원 | 매주 월, 1/1, 설 · 추석 당일 | 054-373-9612 |
| 낙대폭포 | 상시 개방 | 무료 | 연중무휴 | 청도여행자센터 054-371-9282 |
| 신화랑풍류마을 | 09:00~18:00(휴게 12:00~13:00) | 화랑VR체험존 3,000원 / 2,500원 | 매주 월, 1/1, 설 · 추석 당일 | 054-370-7300 |

발견한 문제:
- **운문사 없음**: 콘텐츠랩 국문 관광정보에서 제목 "운문사"로 검색하면 "운문사계절 캠핑장"만 나온다. 청도군 133건에도 없다. 고품질사진에는 "청도 운문사" 99장이 있다. ([콘텐츠랩 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch))
- **중복 콘텐츠**: 구석구석에 와인터널 페이지가 2개 있다. [산업관광 페이지](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=004abc12-2452-4fc6-b7cf-5e9aec5fc916)는 "평일 09:30~20:00 / 주말 09:30~21:00"으로 위 값과 다르다. 소싸움테마파크와 소싸움미디어체험관도 주소가 같은 별도 페이지다(테마파크 페이지의 개요가 체험관 설명이다). 유등연지도 구석구석 데이터의 문의처(청도군청 054-370-6114)가 콘텐츠랩 값과 다르다.
- **[spots-data.md](./spots-data.md)의 와인터널 확인 값**(평일 09:30–18:00, 주말 09:30–19:00)은 contentId 2660803과 일치한다.
- 대표이미지 · 추가 이미지의 `cpyrhtDivCd`는 API를 불러야 알 수 있어 장소별 유형은 **확인 못 함**.
- 구석구석 유등연지 페이지 본문에 "사진 출처: 청도군 SNS홍보단 진성옥 기자"가 적혀 있다. 일부 사진은 제3자 저작물이다. ([구석구석 유등연지](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=906b1962-1889-43f6-84ae-87636efcf61b))

---

## 3. 대안 출처

### 3-1. 공공데이터포털 파일 데이터

**청도군 제공 데이터**: data.go.kr에서 "청도군"으로 검색하면 파일 데이터 77건이 나온다. **관광지 목록 데이터는 없다.** 관광과 가까운 것은 숙박업(수정 2025-05-26), 휴게음식점(2025-05-23), 체육시설정보(2026-03-26), 전국대회정보(2025-06-16), 의무보유 공공미술(2025-06-16) 정도다. ([data.go.kr 검색 "청도군"](https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=%EC%B2%AD%EB%8F%84%EA%B5%B0)) "청도군 관광안내"는 0건이다.

**전국관광지정보표준데이터** (지자체 제공 표준 데이터): 청도군 행이 들어 있다.

| 항목 | 값 | 출처 |
|---|---|---|
| 범위 | 광역단체장이 지정한 관광지역(관광지 · 관광단지, 관광특구 제외) | [data.go.kr 15021141](https://www.data.go.kr/data/15021141/standard.do) |
| 컬럼 | 관광지명, 관광지구분, 소재지도로명주소, 소재지지번주소, **위도, 경도**, 면적, 공공편익시설정보, 숙박/운동및오락/휴양및문화/접객/지원시설정보, 지정일자, 수용인원수, 주차가능수, **관광지소개, 관리기관전화번호**, 관리기관명, 데이터기준일자 | 같은 페이지 |
| 갱신 | 연간. 기관 데이터를 매월 초 병합 | 같은 페이지 |
| 청도군 행 (미리보기) | 프로방스 포토랜드, 와인터널, 청도소싸움경기장, 새마을운동발상지기념공원, 청도신화랑풍류마을, 청도자전거공원, 청도레일바이크, 청도소싸움미디어체험관, 한국코미디타운, 청도박물관 — **10건**, 데이터기준일자 2026-07-23 | 같은 페이지 미리보기 표 |
| 없는 것 | 이용시간 · 휴무 · 요금 · 사진 | 같은 페이지 |
| API | `tn_pubr_public_trrsrt_api` 있음 | 같은 페이지 |

- 미리보기 표는 전국 약 500행만 보여 준다. 청도군 행이 10건뿐인지는 **확인 못 함**(파일 미다운로드).
- 프로방스 주소가 TourAPI(이슬미로 272-23)와 다르다(272-28). 좌표 교차 확인용으로 쓸 만하다.
- 이 표준데이터의 이용허락 문구는 페이지에 링크만 있어 **확인 못 함**.

### 3-2. 청도군 문화관광 누리집

| 항목 | 내용 | 출처 |
|---|---|---|
| 위치 | `cheongdo.go.kr/tour` (별도 tour 서브도메인 아님) | [청도군 문화관광](https://www.cheongdo.go.kr/tour/) |
| 장소 수 | 청도오감만족 > 볼거리 **66건**. 사찰 · 서원 · 산/계곡/폭포 · 온천/약수 · 공원 · 관광명소 탭, 읍면 필터 | [볼거리](https://www.cheongdo.go.kr/tour/contents.do?mid=0101000000) |
| 상세 구성 | 사진 슬라이드, 본문(자유 텍스트), "최신 업데이트" 날짜, 주변 4km 정보(주소 · 좌표가 HTML `data-lat`/`data-lng`에 있음) | [유등연지](https://www.cheongdo.go.kr/tour/place/viewIndex.do?page=1&mid=0101000000&searchIdx=99&searchType=place&searchPlaceType2=1) · [청도박물관](https://www.cheongdo.go.kr/tour/place/viewIndex.do?page=1&mid=0101000000&searchIdx=30&searchType=place&searchPlaceType2=1) |
| 운영 정보 | 구조화된 필드가 없다. 박물관은 본문에 관람시간 · 관람료 · 휴관일이 있고, 유등연지는 없다 | 같은 페이지들 |
| 갱신 | 유등연지 2024-01-24, 청도박물관 2023-10-07 | 같은 페이지들 |
| 저작권 | 청도군이 저작재산권 전부를 가진 자료는 **공공누리 제1유형을 붙여** 개방한다. 공공누리가 없는 자료는 공공저작물 관리책임관과 **사전 협의** 후 이용 | [저작권 정책](https://www.cheongdo.go.kr/portal/contents.do?mid=0606000000) |
| 공공누리 표시 | 확인한 상세 페이지 2곳에는 공공누리 마크가 없다 | 위 상세 페이지 |

결론: 운영 정보 교차 확인용으로는 쓸 수 있다. 사진 · 본문을 그대로 가져다 쓰려면 협의가 필요하다(관리책임관 054-370-6070, 담당 054-370-6377 — [저작권 정책](https://www.cheongdo.go.kr/portal/contents.do?mid=0606000000)).

### 3-3. 한국관광공사 관광사진 갤러리 API (PhotoGalleryService1)

| 항목 | 값 | 출처 |
|---|---|---|
| 데이터셋 | 한국관광공사_관광사진 정보_GW (15101914), 수정 2026-02-25 | [data.go.kr](https://www.data.go.kr/data/15101914/openapi.do) |
| 엔드포인트 | `apis.data.go.kr/B551011/PhotoGalleryService1` | 같은 페이지 |
| 오퍼레이션 | `galleryList1`, `galleryDetailList1`(제목), `gallerySearchList1`(키워드), `gallerySyncDetailList1`(동기화) | 같은 페이지 |
| 응답 필드 | `galContentId`, `galContentTypeId`, `galTitle`, `galWebImageUrl`, `galPhotographyMonth`, `galPhotographyLocation`, `galPhotographer`, `galSearchKeyword`, `galCreatedtime`, `galModifiedtime`, `galUseFlag` | 같은 페이지 |
| 없는 것 | 좌표, 장소(contentId) 연결, 저작권 유형 필드 | 같은 페이지 |
| 라이선스 | 포토코리아 사진 "10만여 장", **공공누리 1유형**, 이용허락범위 제한 없음 | 같은 페이지 |
| 트래픽 · 승인 | 개발 1,000건 · 자동승인 / 운영 심의승인 | 같은 페이지 |

청도 사진 규모(콘텐츠랩 고품질사진, 지역 경북 + 제목 "청도"): **240장, 전부 제1유형**. 청도프로방스 110, 청도 운문사 99, 청도 와인터널 29, 청도읍성 2. 촬영 연도 2012 · 2018 · 2021. 유등연지 · 낙대폭포 · 신화랑 · 코미디타운은 제목 검색 0건. ([콘텐츠랩 통합 검색](https://api.visitkorea.or.kr/#/hubTourSearch)) 갤러리 API의 결과와 같은 사진 풀인지는 **확인 못 함**.

참고: [한국관광공사_지역별 한국관광사진](https://www.data.go.kr/data/15149473/fileData.do)(XLSX, 수정 2026-09-29, 컬럼 CID · 사진 콘텐츠명 · 촬영작가 · depot URL)도 있으나 청도 포함 여부는 **확인 못 함**.

### 3-4. 경상북도 공개 데이터

| 데이터 | 내용 | 쓸모 | 출처 |
|---|---|---|---|
| 경상북도_관광지 현황 (15069224) | 지정 관광지의 구분 · 명칭 · 위치 · 면적 · 지정일 · 사업기간 · 재원. 연간, 수정 2026-01-14 | 낮음 (좌표 · 운영정보 · 사진 없음) | [data.go.kr](https://www.data.go.kr/data/15069224/fileData.do) |
| 경상북도_반려동물동반관광지정보 현황조회 API (15160485) | `tourNm`, `loc`, `area`, `wdate`, 재원 등. 수정 2026-08-05, 개발 10,000건 | 낮음 (같은 구조, 좌표 없음) | [data.go.kr](https://www.data.go.kr/data/15160485/openapi.do) |
| 경북나드리(tour.gb.go.kr) 관광지 API | — | **확인 못 함** | — |

### 3-5. 비교

| 기준 | TourAPI KorService2 | 표준데이터 | 청도군 누리집 | 관광사진 갤러리 |
|---|---|---|---|---|
| 청도 장소 수 | 133 (관광지 54) | 10+ (미리보기) | 볼거리 66 | 사진 240 |
| 좌표 | ✅ 전부 | ✅ | △ HTML 속성 | ❌ |
| 개요 | ✅ 전부 | ✅ 짧음 | ✅ | ❌ |
| 운영 정보 | ✅ 구조화(텍스트 값) | ❌ | △ 본문 텍스트 | ❌ |
| 사진 | ✅ 115건 대표이미지, 1 · 3유형 혼재 | ❌ | ✅ (공공누리 표시 없음) | ✅ 1유형 |
| 라이선스 | 제한 없음 + 출처 표기 + 캐싱 금지 조항 | 확인 못 함 | 1유형 표시물만 자유 | 1유형 |
| 최신성 | 실시간, `modifiedtime` 제공 | 연간 | 2023~2024 갱신 표본 | 촬영 2012~2021 |
| 작업량 | 키 발급 + 3~4회 호출/장소 | 파일 1개 | 수작업 | 키 발급 + 제목 매칭 |

---

## 라이선스 및 출처 표기

### 표기 문구

출처: [한국관광콘텐츠랩 저작권 정책](https://api.visitkorea.or.kr/#/useServiceGuide/2)

| 경우 | 화면에 표시할 문구 |
|---|---|
| OpenAPI · 다운로드 관광정보(텍스트) | `출처 : ⓒ한국관광콘텐츠랩` 또는 `ⓒ한국관광공사` |
| 공사 워터마크가 있는 사진 | `출처 : ⓒ한국관광콘텐츠랩` 또는 `ⓒ한국관광공사` |
| 다른 출처 · 워터마크가 있는 사진 | `데이터 제공: ⓒ한국관광콘텐츠랩` + `출처: ⓒ출처제공자` |
| 워터마크가 없는 사진 | `데이터 제공: ⓒ한국관광콘텐츠랩` |

- 같은 정책: 다른 사이트에 링크 · 업로드할 때 **저작권 정책 안내 링크를 함께 제공**해야 한다.
- 같은 정책 "활용 주의사항": **콘텐츠 캐싱(로컬서버 저장방식) 금지**.
- 공공누리 일반 표기 예시: "본 저작물은 'OOO(기관명)'에서 'OO년' 작성하여 공공누리 제O유형으로 개방한 '저작물명(작성자:OOO)'을 이용하였으며…" ([공공누리](https://www.kogl.or.kr/info/license.do))

### 쓸 수 있는 이미지

출처: [공공누리](https://www.kogl.or.kr/info/license.do) · [콘텐츠랩 저작권 정책](https://api.visitkorea.or.kr/#/useServiceGuide/2) · [data.go.kr 15101578](https://www.data.go.kr/data/15101578/openapi.do)

| 유형 | 조건 | 사용 |
|---|---|---|
| 제1유형 (`Type1`) | 출처표시, 상업 이용 가능, 변경 가능 | **사용** (크롭 · 리사이즈 가능) |
| 제3유형 (`Type3`) | 출처표시, 상업 이용 가능, **변경 · 2차 저작물 금지** | 원본 그대로만. 크롭 · 필터 · 글자 얹기 불가. 리사이즈가 변경에 해당하는지는 **확인 못 함** → 기본 제외 권장 |
| 제2 · 4유형 | 비상업만 | 제외 (경북 고품질사진에 제4유형 62장 있음) |
| 공공누리 표시 없음 (청도군 누리집 사진 등) | 사전 협의 필요 | 제외 |
| 제3자 출처 사진 (예: SNS홍보단) | 출처제공자 표기 필요 | 표기 가능할 때만 |

공통 금지: 피사체 명예훼손 · 인격권 침해 용도, 기업 CI · BI.

---

## 미결 사항 (소유자 결정)

1. **캐싱 금지 조항과 DB 저장**: 콘텐츠랩 정책은 "콘텐츠 캐싱(로컬서버 저장방식) 금지"다. 선택지: (a) 한국관광공사(디지털인프라팀 070-4287-3219, [data.go.kr](https://www.data.go.kr/data/15101578/openapi.do))에 문의해 허용 범위 확인, (b) DB에는 `contentId`와 우리 큐레이션 필드(zone · tags · stayMinutes · tips)만 두고 TourAPI 값은 실시간 조회, (c) 텍스트를 우리 문장으로 새로 쓰고 TourAPI는 확인용으로만 사용.
2. **`checkedAt` 의미**: TourAPI 값을 받아 온 날짜를 `checkedAt`으로 볼지, 장소 공식 출처로 다시 확인한 날짜만 인정할지. (현재 규칙은 "실제로 확인한 날짜")
3. **운문사 텍스트 출처**: TourAPI에 없다. 청도군 누리집 · 운문사 공식 정보 중 무엇을 쓸지, 협의가 필요한지.
4. **중복 콘텐츠 선택**: 와인터널(2개), 소싸움테마파크 / 소싸움미디어체험관, 청도박물관 / 한국코미디타운(바로 옆) 중 무엇을 한 장소로 볼지.
5. **이미지 범위**: 제1유형만 쓸지, 제3유형을 원본 그대로 허용할지. 이미지를 저장할지, `tong.visitkorea.or.kr` URL을 직접 쓸지(1번과 연결).
6. **운영 정보 파싱**: 자유 텍스트를 `OpeningHours`로 사람이 옮길지, 스키마에 원문 필드(`hoursText` 등)를 추가할지.
7. **운영계정 신청 여부**: 개발계정(1,000건/일)으로 충분한지. 133건 × 상세 3~4회 ≈ 400~530회로 1회 전체 수집은 가능하다.
8. **동기화 주기**: `areaBasedSyncList2`의 `modifiedtime` · `showflag`로 주기 동기화할지, 수동 갱신할지.

## 확인 못 한 것

- `ldongCode2` 직접 호출 값(47 / 820은 콘텐츠랩 화면 기준)
- 매뉴얼 버전 · 매뉴얼 본문(zip 미다운로드), 공지 no=207 본문
- 장소별 대표이미지 · 추가 이미지의 `cpyrhtDivCd`
- 청도군 133건이 `areaBasedList2` `totalCount`와 같은지, 행사 0건의 의미
- 운문사 · 청도박물관의 구석구석 여행지 페이지 URL
- 표준데이터의 청도군 전체 행 수와 이용허락 문구
- 경북나드리 관광지 API 유무
- 관광사진 갤러리 API와 콘텐츠랩 고품질사진이 같은 풀인지
- 제3유형 이미지 리사이즈가 "변경"에 해당하는지
- 운영계정 트래픽 상한 수치
