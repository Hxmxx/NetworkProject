import './CameraPage.css';
import { getRandomQuote } from '../utils/randomQuote';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CameraPage = () => {
  const navigate = useNavigate();
  const [randomQuote, setRandomQuote] = useState<{text: string}>({ text: '기본 명언' });
  const [time, setTime] = useState<number>(300); // 5분 = 300초
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  if (time <= 0) {
      document.querySelector('.timer-set')?.setAttribute('style', 'display: block');
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsRunning(true);
    // 녹화 시작
    if (videoRef.current?.srcObject) {
      const mediaRecorder = new MediaRecorder(videoRef.current.srcObject as MediaStream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      mediaRecorder.start();
    }

    timerRef.current = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime <= 1) {
          handleStopTimer();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const handleStopTimer = () => {
    // 녹화 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // 기존 타이머 중지 코드
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);
    setTime(300);
  };

  useEffect(() => {
    // 녹화가 완료되고 시간이 0이 되었을 때
    if (time === 0 && recordedChunks.length > 0) {
      const handleVideoUpload = async () => {
        try {
          const blob = new Blob(recordedChunks, {
            type: 'video/webm'
          });
          
          const formData = new FormData();
          formData.append('video', blob, 'recorded-video.webm');

          const uploadResponse = await fetch('Camera/record', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('영상 분석 중 오류가 발생했습니다.');
          }

          const result = await uploadResponse.json();
          
          navigate('/Result', { 
            state: { analysisResult: result }
          });

        } catch (error) {
          console.error('영상 업로드 오류:', error);
          alert('영상 분석 중 오류가 발생했습니다.');
        }
      };

      handleVideoUpload();
    }
  }, [time, recordedChunks, navigate]);

  // 컴포넌트 언마운트 시 메모리 정리
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecordedChunks([]);
    };
  }, []);

  useEffect(() => {
    setRandomQuote(getRandomQuote());
    const quoteInterval = setInterval(() => {
      setRandomQuote(getRandomQuote());
    }, 10000);
    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    // 웹캠 시작 함수
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('웹캠 접근 오류:', err);
      }
    };

    startWebcam();

    // 컴포넌트 언마운트 시 웹캠 정지
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <>
      <div className="timer-set">
        <div className='timer-set-container'>
          <h2 className='timer-set-title'>검사가 종료되었습니다!</h2>
          <button className='timer-set-btn' onClick={() => navigate('/Result')}>결과 보기</button>
        </div>
      </div>
      <div className='camera-page'>
        <div className='container'>
          <div className={`camera-container ${isRunning ? 'recording' : ''}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
            <div className={`camera-overlay ${isRunning ? 'recording' : ''}`}>
              <span className='camera-overlay-text'>촬영 시작을 눌러주세요</span>
            </div>
          </div>
          <div className='text-container'>
            <div className='timer-container'>
              <h4 className='timer-title'>남은 시간</h4>
              <div className='timer-time'>{formatTime(time)}</div>
              <div className='quote-container'>
                <p className='quote-text'>
                  {randomQuote?.text || '명언을 불러오는 중...'}
                </p>
              </div>
              <div 
                className='timer-button' 
                onClick={handleStartTimer}
                style={{ display: isRunning ? 'none' : 'flex' }}
              >
                촬영 시작
              </div>
              <div 
                className='timer-button'
                onClick={handleStopTimer}
                style={{ display: isRunning ? 'flex' : 'none' }}
              >
                촬영 중지
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CameraPage;
