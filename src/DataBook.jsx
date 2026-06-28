import React, { useState, useEffect, useRef } from 'react';
import { Save, Calendar, Play, Clock, AlertCircle, CheckCircle, Search, Settings, Database, Terminal } from 'lucide-react';

// 어제 날짜 구하기 (KST 기준 - 확정 데이터용)
const getYesterdayString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (9 * 3600000));
  kstTime.setDate(kstTime.getDate() - 1);
  return kstTime.toISOString().split('T')[0];
};

// 오늘 날짜 구하기 (KST 기준 - 실시간 최신 스냅샷 데이터용)
const getTodayString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (9 * 3600000));
  return kstTime.toISOString().split('T')[0];
};

export default function DataBookApp() {
  const [apiKey, setApiKey] = useState('');
  const [characterName, setCharacterName] = useState('');
  
  // 기본값을 '오늘'로 설정하여 유저가 자연스럽게 실시간 데이터를 수집하도록 유도
  const [singleDate, setSingleDate] = useState(getTodayString());
  const [startDate, setStartDate] = useState(getYesterdayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [delaySeconds, setDelaySeconds] = useState(15);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentStr: '' });
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchOcid = async (name) => {
    try {
      const res = await fetch(`https://open.api.nexon.com/maplestory/v1/id?character_name=${encodeURIComponent(name)}`, {
        headers: { 'x-nxopen-api-key': apiKey }
      });
      if (!res.ok) throw new Error('OCID 발급 실패 (캐릭터명 또는 API 키 확인)');
      const data = await res.json();
      return data.ocid;
    } catch (e) {
      addLog(`에러: ${e.message}`, 'error');
      return null;
    }
  };

  const fetchCharacterData = async (ocid, dateStr) => {
    const headers = { 'x-nxopen-api-key': apiKey };
    
    // 핵심 로직: 현재 긁으려는 날짜가 '오늘'인지 판별
    const isToday = dateStr === getTodayString();
    // '오늘'이면 date 파라미터를 생략하여 실시간 스냅샷을 가져오고, '과거'면 일자를 지정함
    const dateParam = isToday ? '' : `&date=${dateStr}`;
    
    try {
      // 1. 기본 정보 먼저 조회 (월드 및 직업, 길드 파악용)
      const basicRes = await fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}${dateParam}`, { headers });
      if (!basicRes.ok) throw new Error(`기본 정보 조회 실패 (${dateStr})`);
      const basicData = await basicRes.json();

      // 2. 확장된 최신 API 엔드포인트 목록
      const endpoints = {
        stats: `/maplestory/v1/character/stat?ocid=${ocid}${dateParam}`,
        equipment: `/maplestory/v1/character/item-equipment?ocid=${ocid}${dateParam}`,
        cashEquipment: `/maplestory/v1/character/cashitem-equipment?ocid=${ocid}${dateParam}`,
        symbols: `/maplestory/v1/character/symbol-equipment?ocid=${ocid}${dateParam}`,
        hexa: `/maplestory/v1/character/hexamatrix?ocid=${ocid}${dateParam}`,
        hexaStat: `/maplestory/v1/character/hexamatrix-stat?ocid=${ocid}${dateParam}`,
        dojang: `/maplestory/v1/character/dojang?ocid=${ocid}${dateParam}`,
        popularity: `/maplestory/v1/character/popularity?ocid=${ocid}${dateParam}`,
        rankingOverall: `/maplestory/v1/ranking/overall?ocid=${ocid}${dateParam}`,
        rankingUnion: `/maplestory/v1/ranking/union?ocid=${ocid}${dateParam}`,
        rankingDojang: `/maplestory/v1/ranking/dojang?ocid=${ocid}${dateParam}`,
        rankingTheSeed: `/maplestory/v1/ranking/theseed?ocid=${ocid}${dateParam}`,
        rankingAchievement: `/maplestory/v1/ranking/achievement?ocid=${ocid}${dateParam}`,
        hyperStat: `/maplestory/v1/character/hyper-stat?ocid=${ocid}${dateParam}`,
        ability: `/maplestory/v1/character/ability?ocid=${ocid}${dateParam}`,
        vmatrix: `/maplestory/v1/character/vmatrix?ocid=${ocid}${dateParam}`,
        linkSkill: `/maplestory/v1/character/link-skill?ocid=${ocid}${dateParam}`,
        android: `/maplestory/v1/character/android-equipment?ocid=${ocid}${dateParam}`,
        pet: `/maplestory/v1/character/pet-equipment?ocid=${ocid}${dateParam}`,
        propensity: `/maplestory/v1/character/propensity?ocid=${ocid}${dateParam}`,
        setEffect: `/maplestory/v1/character/set-effect?ocid=${ocid}${dateParam}`,
        beauty: `/maplestory/v1/character/beauty-equipment?ocid=${ocid}${dateParam}`,
        userAchievement: `/maplestory/v1/user/achievement?ocid=${ocid}${dateParam}`,
        otherStat: `/maplestory/v1/character/other-stat?ocid=${ocid}${dateParam}`,
        ringExchange: `/maplestory/v1/character/ring-exchange-skill-equipment?ocid=${ocid}${dateParam}`,
        ringReserve: `/maplestory/v1/character/ring-reserve-skill-equipment?ocid=${ocid}${dateParam}`,
        union: `/maplestory/v1/user/union?ocid=${ocid}${dateParam}`,
        unionRaider: `/maplestory/v1/user/union-raider?ocid=${ocid}${dateParam}`,
        // 확률형 로그 (계정 단위 파라미터 적용) - 오늘일 경우 최신 1000건을 긁어옴
        historyCube: `/maplestory/v1/history/cube?count=1000${dateParam}`,
        historyStarforce: `/maplestory/v1/history/starforce?count=1000${dateParam}`,
        historyPotential: `/maplestory/v1/history/potential?count=1000${dateParam}`
      };

      const fetchPromises = Object.entries(endpoints).map(async ([endpointKey, path]) => {
        try {
          const r = await fetch(`https://open.api.nexon.com${path}`, { headers });
          if (r.ok) return { key: endpointKey, data: await r.json() };
          return { key: endpointKey, data: null };
        } catch { return { key: endpointKey, data: null }; }
      });

      // 전 차수 스킬 조회 (0~6, hyper)
      const skillGrades = ["0", "1", "2", "3", "4", "5", "6", "hyper"];
      const skillPromises = skillGrades.map(async (grade) => {
        try {
          const res = await fetch(`https://open.api.nexon.com/maplestory/v1/character/skill?ocid=${ocid}&character_skill_grade=${grade}${dateParam}`, { headers });
          return { grade, data: res.ok ? await res.json() : null };
        } catch { return { grade, data: null }; }
      });

      // 길드 정보 조회
      let guildData = null;
      if (basicData.character_guild_name) {
        try {
          const gName = encodeURIComponent(basicData.character_guild_name);
          const wName = encodeURIComponent(basicData.world_name);
          const gIdRes = await fetch(`https://open.api.nexon.com/maplestory/v1/guild/id?guild_name=${gName}&world_name=${wName}`, { headers });
          if (gIdRes.ok) {
            const { oguild_id } = await gIdRes.json();
            const gBasicRes = await fetch(`https://open.api.nexon.com/maplestory/v1/guild/basic?oguild_id=${oguild_id}${dateParam}`, { headers });
            if (gBasicRes.ok) guildData = await gBasicRes.json();
          }
        } catch(e) {}
      }

      const results = await Promise.all(fetchPromises);
      const skillResults = await Promise.all(skillPromises);
      
      // JSON 객체 조립: 실시간이든 과거든 뷰어 타임라인 정렬을 위해 대상 날짜(dateStr)를 명표로 붙임
      const compiledData = { basic: basicData, targetDate: dateStr, isRealTime: isToday, savedAt: new Date().toISOString() };
      results.forEach(({key, data}) => { compiledData[key] = data; });
      
      compiledData.skills = {};
      skillResults.forEach(({grade, data}) => {
        if (data) compiledData.skills[`grade_${grade}`] = data;
      });
      compiledData.guild = guildData;

      return compiledData;
    } catch (e) {
      addLog(`${dateStr} 수집 에러: ${e.message}`, 'error');
      return null;
    }
  };

  const getDatesInRange = (start, end) => {
    const dates = [];
    let curr = new Date(start);
    const endObj = new Date(end);
    while (curr <= endObj) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const triggerDownload = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSingleCollect = async () => {
    if (!apiKey || !characterName) return addLog('API 키와 캐릭터명을 모두 입력해주세요.', 'error');
    setIsRunning(true);
    setLogs([]);
    addLog(`단일 수집 시작: ${characterName} (${singleDate})`);
    
    const ocid = await fetchOcid(characterName);
    if (ocid) {
      const data = await fetchCharacterData(ocid, singleDate);
      if (data) {
        addLog(`수집 성공! JSON 파일을 생성합니다.`, 'success');
        triggerDownload(data, `메이플_데이터북_${characterName}_${singleDate}${singleDate === getTodayString() ? '_실시간' : ''}.json`);
      }
    }
    setIsRunning(false);
  };

  const handleRangeCollect = async () => {
    if (!apiKey || !characterName) return addLog('API 키와 캐릭터명을 모두 입력해주세요.', 'error');
    if (!startDate || !endDate) return addLog('시작일과 종료일을 설정해주세요.', 'error');
    
    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) return addLog('종료일이 시작일보다 빠릅니다.', 'error');
    
    setIsRunning(true);
    setLogs([]);
    addLog(`일괄 수집 시작: ${characterName} (총 ${dates.length}일치)`);
    addLog(`주의: 안전을 위해 각 일자별로 ${delaySeconds}초의 텀을 두고 수집합니다.`, 'info');
    
    const ocid = await fetchOcid(characterName);
    if (!ocid) { setIsRunning(false); return; }

    const combinedData = [];
    for (let i = 0; i < dates.length; i++) {
      const targetDate = dates[i];
      setProgress({ current: i + 1, total: dates.length, currentStr: targetDate });
      
      if (targetDate === getTodayString()) {
        addLog(`[${i + 1}/${dates.length}] ${targetDate} (오늘/실시간) 데이터 수집 중...`, 'info');
      } else {
        addLog(`[${i + 1}/${dates.length}] ${targetDate} 과거 확정 데이터 수집 중...`);
      }
      
      const data = await fetchCharacterData(ocid, targetDate);
      if (data) combinedData.push(data);
      
      if (i < dates.length - 1) {
        addLog(`${delaySeconds}초 대기 중...`, 'info');
        await delay(delaySeconds * 1000);
      }
    }

    addLog(`전체 수집 완료! 통합 JSON 파일을 생성합니다.`, 'success');
    triggerDownload(combinedData, `메이플_데이터북_${characterName}_통합본_${startDate.replace(/-/g,'')}_${endDate.replace(/-/g,'')}.json`);
    setIsRunning(false);
    setProgress({ current: 0, total: 0, currentStr: '' });
  };

  const showRealTimeWarning = singleDate === getTodayString() || endDate === getTodayString();

  return (
    <div className="min-h-screen bg-[#111318] text-slate-100 font-sans pb-20 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 헤더 */}
        <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 text-center space-y-4">
          <Database className="w-12 h-12 text-orange-500 mx-auto" />
          <h1 className="text-3xl font-bold text-white">메이플스토리 챌린저스 데이터북</h1>
          <p className="text-slate-400">넥슨 OpenAPI를 이용하여 내 캐릭터의 모든 성장 기록을 영구 보존용 파일로 만듭니다.<br/>서버가 닫히기 전 소중한 기록을 로컬 PC에 백업하세요.</p>
        </div>

        {/* 설정 영역 */}
        <div className="bg-[#181a20] p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center">
                <Settings className="w-4 h-4 mr-1 text-slate-400" /> Nexon OpenAPI Key
              </label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="발급받은 라이브 API 키" disabled={isRunning}
                className="w-full bg-[#111318] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center">
                <Search className="w-4 h-4 mr-1 text-slate-400" /> 캐릭터명
              </label>
              <input type="text" value={characterName} onChange={e => setCharacterName(e.target.value)} placeholder="캐릭터 닉네임" disabled={isRunning}
                className="w-full bg-[#111318] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            {/* 단일 날짜 조회 */}
            <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50 space-y-4">
              <h3 className="font-semibold text-slate-200 flex items-center"><Search className="w-4 h-4 mr-2 text-blue-400"/> 모드 1: 단일 날짜 백업</h3>
              <div className="flex gap-2">
                <input type="date" value={singleDate} max={getTodayString()} onChange={e => setSingleDate(e.target.value)} disabled={isRunning}
                  className="flex-1 bg-[#111318] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 custom-calendar-icon" />
                <button onClick={handleSingleCollect} disabled={isRunning} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">조회하기</button>
              </div>
            </div>

            {/* 자동 일괄 수집 */}
            <div className="bg-orange-900/10 p-5 rounded-xl border border-orange-500/20 space-y-4">
              <h3 className="font-semibold text-orange-400 flex items-center"><Database className="w-4 h-4 mr-2"/> 모드 2: 자동 일괄 수집 (영구 보존용)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">시작일</span>
                  <input type="date" value={startDate} max={getTodayString()} onChange={e => setStartDate(e.target.value)} disabled={isRunning} className="w-full bg-[#111318] border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 custom-calendar-icon" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">종료일</span>
                  <input type="date" value={endDate} max={getTodayString()} onChange={e => setEndDate(e.target.value)} disabled={isRunning} className="w-full bg-[#111318] border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 custom-calendar-icon" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2 bg-[#111318] border border-slate-700 rounded-lg px-3 py-1.5 flex-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400 whitespace-nowrap">수집 텀(초):</span>
                  <input type="number" min="1" value={delaySeconds} onChange={e => setDelaySeconds(Number(e.target.value))} disabled={isRunning} className="w-12 bg-transparent text-sm text-white focus:outline-none text-right" />
                </div>
                <button onClick={handleRangeCollect} disabled={isRunning} className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-lg shadow-orange-900/20">
                  <Play className="w-4 h-4 mr-1.5 fill-current" /> 자동 일괄 수집 시작
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 실시간 수집 경고 안내문 */}
        {showRealTimeWarning && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-xl flex items-start text-sm text-blue-300 shadow-md">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0 text-blue-400 mt-0.5" />
            <div>
              <strong className="text-blue-200 block mb-1">오늘 날짜를 포함하여 실시간 데이터를 수집합니다!</strong>
              <p className="text-xs leading-relaxed opacity-90">
                오늘(당일) 날짜의 데이터는 새벽 2시에 갱신되는 과거 확정본이 아닌 <strong className="text-white">현재 인게임 스냅샷(실시간 스펙)</strong>을 가져옵니다.<br/>
                따라서 완벽한 최신 상태를 반영하려면 수집 버튼을 누르기 전, 반드시 게임에 접속하여 <strong className="text-white bg-blue-900/50 px-1 rounded">로그아웃, 캐릭터 선택창 이동, 캐시샵 방문 중 하나를 1회 진행</strong>하여 넥슨 서버에 캐릭터 정보를 갱신해 주세요!
              </p>
            </div>
          </div>
        )}

        {/* 진행 상황 및 콘솔 로그 */}
        <div className="bg-[#181a20] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="bg-[#1e2028] px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <span className="text-sm font-semibold flex items-center text-slate-300"><Terminal className="w-4 h-4 mr-2" /> 실행 콘솔</span>
            {isRunning && progress.total > 0 && (
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                진행률: {Math.round((progress.current / progress.total) * 100)}% ({progress.current}/{progress.total})
              </span>
            )}
          </div>
          
          {isRunning && progress.total > 0 && (
            <div className="h-1 bg-slate-800 w-full">
              <div className="h-full bg-orange-500 transition-all duration-300 ease-out" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
            </div>
          )}

          <div className="p-4 h-64 overflow-y-auto font-mono text-xs bg-[#111318] space-y-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-slate-600 flex h-full items-center justify-center">대기 중... 설정을 완료하고 수집을 시작하세요.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`flex ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'info' ? 'text-blue-400' : 'text-slate-300'}`}>
                  <span className="text-slate-600 mr-3 shrink-0">[{log.time}]</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-calendar-icon::-webkit-calendar-picker-indicator { filter: invert(0.8) sepia(1) hue-rotate(180deg); cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
      `}} />
    </div>
  );
}