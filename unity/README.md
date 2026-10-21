# YardAX Unity 드롭인 소스

Unity 프로젝트가 이 저장소에 아직 없어, **프로젝트에 복사해 넣는 드롭인 형태**로
제공한다. 복사 위치:

| 이 폴더 | Unity 프로젝트 |
|---|---|
| `Scripts/Data/*.cs` | `Assets/Scripts/Data/` |
| `Tests/EditMode/*.cs` | `Assets/Tests/EditMode/` (asmdef: nunit.framework 참조) |
| `../docs/data/yard_schedule_demo.json` | `Assets/StreamingAssets/yard_schedule_demo.json` |

- `FacilityMapTable` 에셋 생성: Project 창 우클릭 → Create → YardAX → Facility Map Table,
  시설 1~22의 씬 오브젝트 이름과 카메라 프리셋을 채운다 (씬 직접 수정 없음).
- 배치 모드 테스트:
  ```bash
  "$UNITY_PATH" -batchmode -projectPath . -runTests -testPlatform EditMode \
    -testResults results/editmode.xml -logFile logs/test.log -quit
  ```
- 이 폴더의 코드는 외부 의존이 Unity 기본 + NUnit뿐이라 그대로 컴파일된다.
  단, 이 저장소에서는 컴파일 검증을 할 수 없으므로 프로젝트에 넣은 뒤
  Editor.log(콘솔)로 확인할 것.
