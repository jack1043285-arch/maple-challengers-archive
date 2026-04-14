import React, { useState, useRef } from 'react';
import { Search, Save, AlertCircle, Download, Activity, CheckCircle, Zap, Shield, Hexagon, Play, Square, Terminal, Settings } from 'lucide-react';

export default function App() {
  // 1. 기본값 공란으로 세팅 (사용자 요청 반영)
  const [apiKey, setApiKey] = useState('');
  const [charName, setCharName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [characterData, setCharacterData] = useState(null);

  const getYesterdayString = () => {
    const today = new Date();
    const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    kstDate.setDate(kstDate.getDate() - 1);
    
    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [targetDate, setTargetDate] = useState(getYesterdayString());

  // 자동 수집 관련 설정 상태 (수집 날짜, 텀 수정 기능 추가)
  const [autoStartDate, setAutoStartDate] = useState('2025-12-18');
  const [autoEndDate, setAutoEndDate] = useState(getYesterdayString());
  const [autoInterval, setAutoInterval] = useState(15); // 기본 15초

  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [autoProgress, setAutoProgress] = useState({ current: 0, total: 0 });
  const [autoLogs, setAutoLogs] = useState([]);
  const abortControllerRef = useRef(null);

  // 핵심 데이터 수집 로직 (단일 날짜용 - 확장된 엔드포인트 모두 포함)
  const fetchCharacterDataForDate = async (name, key, dateStr) => {
    const headers = { 'x-nxopen-api-key': key };
    
    // 1. OCID 조회
    const idResponse = await fetch(`https://open.api.nexon.com/maplestory/v1/id?character_name=${encodeURIComponent(name)}`, { headers });
    if (!idResponse.ok) throw new Error('캐릭터를 찾을 수 없거나 API 키가 유효하지 않습니다.');
    const idData = await idResponse.json();
    const ocid = idData.ocid;

    // 2. 기본 정보 먼저 조회 (길드 정보 조회를 위해 world_name, guild_name 필요)
    const basicRes = await fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}&date=${dateStr}`, { headers });
    if (!basicRes.ok) throw new Error(`[${dateStr}] 기본 정보를 불러오지 못했습니다.`);
    const basicData = await basicRes.json();

    // 3. 확장된 병렬 조회용 엔드포인트 목록
    const endpoints = {
      stats: `/maplestory/v1/character/stat?ocid=${ocid}&date=${dateStr}`,
      equipment: `/maplestory/v1/character/item-equipment?ocid=${ocid}&date=${dateStr}`,
      cashEquipment: `/maplestory/v1/character/cashitem-equipment?ocid=${ocid}&date=${dateStr}`,
      symbols: `/maplestory/v1/character/symbol-equipment?ocid=${ocid}&date=${dateStr}`,
      hexa: `/maplestory/v1/character/hexamatrix?ocid=${ocid}&date=${dateStr}`,
      hexaStat: `/maplestory/v1/character/hexamatrix-stat?ocid=${ocid}&date=${dateStr}`,
      dojang: `/maplestory/v1/character/dojang?ocid=${ocid}&date=${dateStr}`,
      popularity: `/maplestory/v1/character/popularity?ocid=${ocid}&date=${dateStr}`,
      rankingOverall: `/maplestory/v1/ranking/overall?ocid=${ocid}&date=${dateStr}`,
      rankingUnion: `/maplestory/v1/ranking/union?ocid=${ocid}&date=${dateStr}`,
      rankingDojang: `/maplestory/v1/ranking/dojang?ocid=${ocid}&date=${dateStr}`,
      rankingTheSeed: `/maplestory/v1/ranking/theseed?ocid=${ocid}&date=${dateStr}`,
      rankingAchievement: `/maplestory/v1/ranking/achievement?ocid=${ocid}&date=${dateStr}`,
      hyperStat: `/maplestory/v1/character/hyper-stat?ocid=${ocid}&date=${dateStr}`,
      ability: `/maplestory/v1/character/ability?ocid=${ocid}&date=${dateStr}`,
      // --- 새로 추가된 엔드포인트 ---
      vmatrix: `/maplestory/v1/character/vmatrix?ocid=${ocid}&date=${dateStr}`,
      linkSkill: `/maplestory/v1/character/link-skill?ocid=${ocid}&date=${dateStr}`,
      android: `/maplestory/v1/character/android-equipment?ocid=${ocid}&date=${dateStr}`,
      pet: `/maplestory/v1/character/pet-equipment?ocid=${ocid}&date=${dateStr}`,
      propensity: `/maplestory/v1/character/propensity?ocid=${ocid}&date=${dateStr}`,
      setEffect: `/maplestory/v1/character/set-effect?ocid=${ocid}&date=${dateStr}`,
      beauty: `/maplestory/v1/character/beauty-equipment?ocid=${ocid}&date=${dateStr}`,
      // 확률형 이력 (count 파라미터 필요, 보통 계정 단위라 ocid 미포함 또는 포함. 예외 방어 적용)
      historyCube: `/maplestory/v1/history/cube?count=1000&date=${dateStr}`,
      historyStarforce: `/maplestory/v1/history/starforce?count=1000&date=${dateStr}`,
      historyPotential: `/maplestory/v1/history/potential?count=1000&date=${dateStr}`,
      // --- 사용자 제공 리스트 기반 신규 추가 ---
      userAchievement: `/maplestory/v1/user/achievement?ocid=${ocid}&date=${dateStr}`,
      otherStat: `/maplestory/v1/character/other-stat?ocid=${ocid}&date=${dateStr}`,
      ringExchange: `/maplestory/v1/character/ring-exchange-skill-equipment?ocid=${ocid}&date=${dateStr}`,
      ringReserve: `/maplestory/v1/character/ring-reserve-skill-equipment?ocid=${ocid}&date=${dateStr}`
    };

    const fetchPromises = Object.entries(endpoints).map(async ([endpointKey, path]) => {
      try {
        const res = await fetch(`https://open.api.nexon.com${path}`, { headers });
        return { key: endpointKey, data: res.ok ? await res.json() : null };
      } catch (e) {
        return { key: endpointKey, data: null }; 
      }
    });

    // 4. 스킬 트리 조회 (0~6차, hyper 모두 조회)
    const skillGrades = ["0", "1", "2", "3", "4", "5", "6", "hyper"];
    const skillPromises = skillGrades.map(async (grade) => {
      try {
        const res = await fetch(`https://open.api.nexon.com/maplestory/v1/character/skill?ocid=${ocid}&date=${dateStr}&character_skill_grade=${grade}`, { headers });
        return { grade, data: res.ok ? await res.json() : null };
      } catch (e) { return { grade, data: null }; }
    });

    // 5. 길드 상세 정보 조회
    let guildData = null;
    let rankingGuildData = null;
    if (basicData.character_guild_name) {
      try {
        const guildNameEncoded = encodeURIComponent(basicData.character_guild_name);
        const worldNameEncoded = encodeURIComponent(basicData.world_name);
        
        const gIdRes = await fetch(`https://open.api.nexon.com/maplestory/v1/guild/id?guild_name=${guildNameEncoded}&world_name=${worldNameEncoded}`, { headers });
        if (gIdRes.ok) {
          const { oguild_id } = await gIdRes.json();
          const gBasicRes = await fetch(`https://open.api.nexon.com/maplestory/v1/guild/basic?oguild_id=${oguild_id}&date=${dateStr}`, { headers });
          if (gBasicRes.ok) guildData = await gBasicRes.json();
        }

        const gRankRes = await fetch(`https://open.api.nexon.com/maplestory/v1/ranking/guild?guild_name=${guildNameEncoded}&world_name=${worldNameEncoded}&date=${dateStr}`, { headers });
        if (gRankRes.ok) rankingGuildData = await gRankRes.json();
      } catch(e) {}
    }

    // 6. 모든 병렬 데이터 병합
    const results = await Promise.all(fetchPromises);
    const skillResults = await Promise.all(skillPromises);
    
    const compiledData = { basic: basicData };
    results.forEach(({key, data}) => { compiledData[key] = data; });
    
    // 스킬 데이터를 하나로 묶기
    compiledData.skills = {};
    skillResults.forEach(({grade, data}) => {
      if (data) compiledData.skills[`grade_${grade}`] = data;
    });

    compiledData.guild = guildData;
    compiledData.rankingGuild = rankingGuildData;

    return {
      savedAt: new Date().toISOString(),
      targetDate: dateStr,
      serverInfo: 'Challengers / Event World Archive',
      ...compiledData
    };
  };

  // 단일 조회
  const fetchData = async () => {
    if (!apiKey || !charName) {
      setError('API 키와 캐릭터명을 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setCharacterData(null);
    try {
      const data = await fetchCharacterDataForDate(charName, apiKey, targetDate);
      setCharacterData(data);
    } catch (err) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그 추가 헬퍼
  const addLog = (msg) => {
    setAutoLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // 대량 자동 수집 로직
  const startAutoFetch = async () => {
    if (!apiKey || !charName) {
      setError('API 키와 캐릭터명을 확인해주세요.');
      return;
    }
    if (new Date(autoStartDate) > new Date(autoEndDate)) {
      setError('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }
    if (autoInterval < 1) {
      setError('수집 텀은 최소 1초 이상이어야 합니다.');
      return;
    }

    let currentDate = new Date(autoStartDate);
    const endDate = new Date(autoEndDate);
    
    const diffTime = Math.abs(endDate - currentDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setIsAutoFetching(true);
    setError('');
    setAutoProgress({ current: 0, total: totalDays });
    setAutoLogs([`🚀 자동 수집 시작: ${autoStartDate} ~ ${autoEndDate} (총 ${totalDays}일)`]);
    
    abortControllerRef.current = new AbortController();
    const allCollectedData = [];

    for (let i = 0; i < totalDays; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addLog('🛑 사용자에 의해 수집이 중단되었습니다.');
        break;
      }

      const dateString = currentDate.toISOString().split('T')[0];
      addLog(`진행중 (${i + 1}/${totalDays}) - ${dateString} 데이터 호출...`);

      try {
        const dailyData = await fetchCharacterDataForDate(charName, apiKey, dateString);
        allCollectedData.push(dailyData);
        addLog(`✅ ${dateString} 수집 성공.`);
      } catch (err) {
        addLog(`❌ ${dateString} 수집 실패: ${err.message}`);
      }

      setAutoProgress({ current: i + 1, total: totalDays });

      if (i < totalDays - 1 && !abortControllerRef.current?.signal.aborted) {
        addLog(`⏳ 다음 호출 대기 중 (${autoInterval}초)...`);
        await new Promise(resolve => setTimeout(resolve, autoInterval * 1000));
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (!abortControllerRef.current?.signal.aborted && allCollectedData.length > 0) {
      addLog('🎉 모든 데이터 수집 완료! 통합 JSON 파일 다운로드를 시작합니다.');
      downloadCombinedJSON(allCollectedData, autoStartDate, autoEndDate);
    }
    
    setIsAutoFetching(false);
  };

  const stopAutoFetch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const downloadCombinedJSON = (dataArray, start, end) => {
    const dataStr = JSON.stringify(dataArray, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `메이플_데이터북_${charName}_통합본_${start.replace(/-/g,'')}_${end.replace(/-/g,'')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!characterData) return;
    const dataStr = JSON.stringify(characterData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `메이플스토리_데이터북_${characterData.basic.character_name}_${characterData.targetDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatValue = (statName) => {
    if (!characterData?.stats?.final_stat) return '0';
    const stat = characterData.stats.final_stat.find(s => s.stat_name === statName);
    return stat ? stat.stat_value : '0';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans pb-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-orange-400">메이플스토리 챌린저스 데이터북</h1>
          <p className="text-slate-400">
            단일 날짜 조회 및 커스텀 기간/텀 자동 일괄 수집을 지원합니다.
          </p>
        </header>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl space-y-6">
          {/* 입력 폼 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nexon OpenAPI Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="발급받은 라이브 API 키"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">캐릭터명</label>
              <input 
                type="text"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="캐릭터 닉네임"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500 text-slate-300"
              />
            </div>
          </div>

          <hr className="border-slate-700" />

          {/* 모드 선택 및 실행 버튼 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 단일 날짜 조회 */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center">
                <Search className="w-4 h-4 mr-2 text-blue-400" /> 모드 1: 단일 날짜 조회
              </h3>
              <div className="flex space-x-2">
                <input 
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  max={getYesterdayString()}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 [color-scheme:dark]"
                />
                <button 
                  onClick={fetchData}
                  disabled={loading || isAutoFetching}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? '조회 중...' : '조회하기'}
                </button>
              </div>
            </div>

            {/* 대량 자동 수집 커스텀 설정 */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-orange-900/50">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center">
                <Settings className="w-4 h-4 mr-2 text-orange-400" /> 모드 2: 자동 일괄 수집
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">시작일</label>
                  <input 
                    type="date" value={autoStartDate} onChange={(e) => setAutoStartDate(e.target.value)} max={getYesterdayString()}
                    disabled={isAutoFetching} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-300 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">종료일</label>
                  <input 
                    type="date" value={autoEndDate} onChange={(e) => setAutoEndDate(e.target.value)} max={getYesterdayString()}
                    disabled={isAutoFetching} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-300 [color-scheme:dark]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">수집 텀(초):</span>
                <input 
                  type="number" min="1" value={autoInterval} onChange={(e) => setAutoInterval(Number(e.target.value))}
                  disabled={isAutoFetching} className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-300"
                />
              </div>
              
              {!isAutoFetching ? (
                <button 
                  onClick={startAutoFetch}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center transition-colors mt-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" /> 자동 일괄 수집 시작
                </button>
              ) : (
                <button 
                  onClick={stopAutoFetch}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center transition-colors shadow-lg shadow-red-900/20 mt-2"
                >
                  <Square className="w-4 h-4 mr-2" /> 수집 중단
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* 자동 수집 진행 상황 터미널 */}
        {isAutoFetching && (
          <div className="bg-[#0D1117] rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
              <span className="text-xs font-mono text-slate-400 flex items-center"><Terminal className="w-4 h-4 mr-2"/> Auto-Fetch Console</span>
              <span className="text-xs font-mono text-orange-400">
                진행률: {autoProgress.current} / {autoProgress.total} ({(autoProgress.current / autoProgress.total * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="p-4 h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-1 custom-scrollbar flex flex-col-reverse">
              {[...autoLogs].reverse().map((log, idx) => (
                <div key={idx} className={log.includes('❌') ? 'text-red-400' : log.includes('⏳') ? 'text-slate-500' : ''}>
                  {log}
                </div>
              ))}
            </div>
            <div className="w-full bg-slate-800 h-1">
              <div 
                className="bg-orange-500 h-1 transition-all duration-1000" 
                style={{ width: `${(autoProgress.current / autoProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 단일 조회 결과 렌더링 */}
        {characterData && characterData.basic && !isAutoFetching && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-semibold text-slate-200">단일 날짜 기록 프리뷰</h2>
              <button 
                onClick={downloadJSON}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors shadow-lg shadow-green-900/20"
              >
                <Download className="w-4 h-4 mr-2" />
                {characterData.targetDate} 전체 데이터북 영구 저장
              </button>
            </div>

            <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 flex flex-col md:flex-row items-center gap-8 border-b border-slate-700/50">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
                  <img 
                    src={characterData.basic.character_image} 
                    alt="Character" 
                    className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl"
                  />
                </div>

                <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                    <div className="flex items-center justify-center md:justify-start space-x-2 text-sm text-slate-400 mb-1">
                      <span className="px-2 py-0.5 bg-slate-700 rounded-full">{characterData.basic.world_name}</span>
                      <span>•</span>
                      <span>{characterData.basic.character_class}</span>
                    </div>
                    <h3 className="text-4xl font-bold text-white tracking-tight">
                      {characterData.basic.character_name}
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">레벨</p>
                      <p className="text-xl font-bold text-orange-400">Lv. {characterData.basic.character_level}</p>
                    </div>
                    <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">누적 경험치</p>
                      <p className="text-lg font-bold text-slate-200">
                        {Number(characterData.basic.character_exp).toLocaleString()} ({characterData.basic.character_exp_rate}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-slate-800 border-b border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  주요 전투 스탯 및 어빌리티
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '전투력', value: getStatValue('전투력') },
                    { label: '최대 HP', value: getStatValue('최대 HP') },
                    { label: '보스 몬스터 데미지', value: `${getStatValue('보스 몬스터 데미지')}%` },
                    { label: '방어율 무시', value: `${getStatValue('방어율 무시')}%` },
                    { label: '크리티컬 데미지', value: `${getStatValue('크리티컬 데미지')}%` },
                    { label: '스타포스', value: getStatValue('스타포스') },
                    { label: '아케인포스', value: getStatValue('아케인포스') },
                    { label: '어센틱포스', value: getStatValue('어센틱포스') },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-900 px-4 py-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                      <span className="text-xs text-slate-400">{stat.label}</span>
                      <span className="font-semibold text-slate-200 text-sm">
                        {Number(stat.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 신규 수집 내역 확인용 섹션 */}
              <div className="p-8 bg-slate-800/80">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  초대형 확장판 JSON 전체 수집 항목 (원본 보존)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'equipment', label: '장비' },
                    { key: 'cashEquipment', label: '코디' },
                    { key: 'symbols', label: '아케인/어센틱 심볼' },
                    { key: 'hexa', label: 'HEXA 스킬 코어' },
                    { key: 'hexaStat', label: 'HEXA 스탯' },
                    { key: 'vmatrix', label: 'V 매트릭스' },
                    { key: 'skills', label: '전 차수 스킬 트리' },
                    { key: 'linkSkill', label: '링크 스킬' },
                    { key: 'guild', label: '길드 상세 정보' },
                    { key: 'propensity', label: '성향' },
                    { key: 'setEffect', label: '세트 효과' },
                    { key: 'beauty', label: '뷰티(외형/믹염)' },
                    { key: 'popularity', label: '인기도' },
                    { key: 'android', label: '안드로이드' },
                    { key: 'pet', label: '펫 장비' },
                    { key: 'rankingOverall', label: '종합 랭킹' },
                    { key: 'historyCube', label: '큐브 로그' },
                    { key: 'historyStarforce', label: '스타포스 로그' },
                    { key: 'historyPotential', label: '잠재 재설정 로그' },
                    { key: 'userAchievement', label: '업적 정보' },
                    { key: 'otherStat', label: '기타 능력치' },
                    { key: 'ringExchange', label: '링 익스체인지' },
                    { key: 'ringReserve', label: '예비 특수 반지' },
                    { key: 'rankingGuild', label: '길드 랭킹' }
                  ].map((item, idx) => (
                    <div key={idx} className={`flex items-center text-sm ${characterData[item.key] ? 'text-green-400' : 'text-slate-500 opacity-50'}`}>
                      <CheckCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  * 초록색으로 체크된 수많은 방대한 엔드포인트가 [전체 데이터북 영구 저장] 시 JSON 파일 하나에 압축 보관됩니다.<br/>
                  * <strong>스킬 트리</strong>는 0~6차, 하이퍼 스킬까지 각각 파싱되어 배열 형태로 내부 저장되었습니다.<br/>
                  * <strong>길드 정보</strong>도 캐릭터 식별자(OCID) 기반으로 다중 호출되어 안전하게 담겨있습니다.
                </p>
              </div>

            </div>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
      `}} />
    </div>
  );
}