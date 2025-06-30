'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [pixelSize, setPixelSize] = useState(8); // ピクセルサイズの初期値
  const [colorDepth, setColorDepth] = useState(16); // 色の深さ（量子化の強さ）

  // カメラストリームの開始
  const startCamera = async () => {
    try {
      console.log('カメラアクセス要求中...');
      
      // より具体的な設定で要求
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('カメラアクセス許可取得成功');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 明示的にビデオを再生
        try {
          await videoRef.current.play();
          console.log('ビデオ再生開始');
        } catch (playError) {
          console.error('ビデオ再生エラー:', playError);
        }
        
        setIsStreaming(true);
        setError(null);
      } else {
        console.error('videoRef.current が見つかりません');
      }
    } catch (err) {
      console.error('カメラへのアクセスエラー:', err);
      setError('カメラへのアクセスが拒否されたか、デバイスが利用できません');
    }
  };

  // カメラストリームの停止
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // 16bit風エフェクトの適用
  const apply16BitEffect = () => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;
    
    // 現在のピクセルサイズと色深度を使用

    const video = videoRef.current;
    const canvas = canvasRef.current;
    // willReadFrequently オプションを追加してパフォーマンス警告に対応
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // ビデオの準備状態をチェック
    if (video.readyState < 2) {
      console.log('ビデオがまだ準備できていません。状態:', video.readyState);
      requestAnimationFrame(apply16BitEffect);
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('ビデオのサイズが無効です:', video.videoWidth, 'x', video.videoHeight);
      requestAnimationFrame(apply16BitEffect);
      return;
    }

    // 元のビデオサイズ
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // ドット絵風にするためピクセル数を減らす（解像度を下げる）
    // pixelSizeステート変数を使用（スケールバーで調整可能）
    const lowResWidth = Math.floor(originalWidth / pixelSize);
    const lowResHeight = Math.floor(originalHeight / pixelSize);

    // キャンバスのサイズを設定
    if (canvas.width !== originalWidth || canvas.height !== originalHeight) {
      // 最終出力サイズは元のビデオサイズと同じに
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      console.log('キャンバスサイズ設定:', canvas.width, 'x', canvas.height);
    }

    try {
      // 一時的な小さいキャンバスを作成（低解像度用）
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d', { willReadFrequently: true });
      tempCanvas.width = lowResWidth;
      tempCanvas.height = lowResHeight;

      // 小さいキャンバスにビデオを縮小描画（これがピクセレーション効果の鍵）
      tempContext.drawImage(video, 0, 0, lowResWidth, lowResHeight);
      
      // 小さいキャンバスから画像データを取得
      const imageData = tempContext.getImageData(0, 0, lowResWidth, lowResHeight);
      const data = imageData.data;

    // 色数を減らして16bit風に変換
    for (let i = 0; i < data.length; i += 4) {
      // colorDepthの値に基づいて量子化の強さを調整
      // 値が大きいほど色数が少なくなる（よりレトロに）
      const quantize = colorDepth; // スライダーの値そのものを使用
      
      // 色の量子化（各チャネルをquantize段階に減色）
      data[i] = Math.round(data[i] / quantize) * quantize;       // R
      data[i + 1] = Math.round(data[i + 1] / quantize) * quantize; // G
      data[i + 2] = Math.round(data[i + 2] / quantize) * quantize; // B
      
      // コントラストを上げて「はっきりした」感じにする
      const contrastBoost = Math.min(quantize, 20); // 量子化が強いほどコントラストも強めに
      data[i] = data[i] < 128 ? Math.max(0, data[i] - contrastBoost) : Math.min(255, data[i] + contrastBoost);
      data[i + 1] = data[i + 1] < 128 ? Math.max(0, data[i + 1] - contrastBoost) : Math.min(255, data[i + 1] + contrastBoost);
      data[i + 2] = data[i + 2] < 128 ? Math.max(0, data[i + 2] - contrastBoost) : Math.min(255, data[i + 2] + contrastBoost);
      
      // ディザリングを追加するためのノイズ（特定のピクセルに適用）
      if (Math.random() > 0.9) {
        const noiseAmount = Math.min(quantize * 2, 40); // 量子化に合わせてノイズも調整
        data[i] = Math.min(255, data[i] + noiseAmount);
        data[i + 1] = Math.min(255, data[i + 1] + noiseAmount);
        data[i + 2] = Math.min(255, data[i + 2] + noiseAmount);
      }
    }

      // 処理した画像データを小さいキャンバスに戻す
      tempContext.putImageData(imageData, 0, 0);
      
      // メインのキャンバスをクリア
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // 小さいキャンバスの内容を大きいキャンバスに拡大描画（ピクセル化効果）
      context.imageSmoothingEnabled = false; // 重要: スムージングを無効化してピクセル感を保持
      context.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);
      
      // オプション: CRTモニター風のオーバーレイ効果
      /*
      context.globalCompositeOperation = 'overlay';
      context.fillStyle = 'rgba(0, 20, 40, 0.1)'; // 微妙な青緑色のオーバーレイ
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
      */
      
      console.log('16bit効果適用完了');
    } catch (err) {
      console.error('キャンバス処理エラー:', err);
      // エラーの詳細情報
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('キャンバスサイズエラー - width:', canvas.width, 'height:', canvas.height);
      }
    }

    // 次のフレームの処理
    if (isStreaming) {
      requestAnimationFrame(apply16BitEffect);
    }
  };

  // コンポーネントマウント時にカメラを開始
  useEffect(() => {
    startCamera();
    
    // コンポーネントのクリーンアップ時にカメラを停止
    return () => {
      stopCamera();
    };
  }, []);

  // ストリーミングが開始されたらエフェクトを適用
  useEffect(() => {
    if (isStreaming) {
      console.log('ストリーミング状態変更: 開始');
      requestAnimationFrame(apply16BitEffect);
    } else {
      console.log('ストリーミング状態変更: 停止');
    }
  }, [isStreaming]);
  
  // スライダー値変更時に即座に反映
  useEffect(() => {
    if (isStreaming) {
      console.log('エフェクト設定変更: ピクセルサイズ=' + pixelSize + ', 色深度=' + colorDepth);
      // キャンバスをクリアして再描画を促す
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [pixelSize, colorDepth]);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>16bit Camera</h1>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.cameraContainer}>
        {/* 元の映像（デバッグ用に表示） */}
        <video 
          ref={videoRef}
          className={styles.videoDebug} // デバッグ中は表示に
          autoPlay
          playsInline
          muted
          width={640}
          height={480}
          style={{ display: 'none' }} // スタイルで非表示
          onLoadedMetadata={(e) => {
            console.log('ビデオメタデータ読み込み完了:', e.target.videoWidth, 'x', e.target.videoHeight);
          }}
          onLoadedData={() => {
            console.log('ビデオデータ読み込み完了');
            // データ読み込み完了時に明示的にストリーミング開始
            if (videoRef.current && videoRef.current.readyState >= 2) {
              setIsStreaming(true);
            }
          }}
          onPlay={() => {
            console.log('ビデオ再生開始');
            setIsStreaming(true);
          }}
        />
        
        {/* 16bit風に変換された映像 */}
        <canvas 
          ref={canvasRef}
          className={styles.canvas}
        />
      </div>
      
      <div className={styles.controls}>
        <button 
          className={styles.button}
          onClick={isStreaming ? stopCamera : startCamera}
        >
          {isStreaming ? 'カメラを停止' : 'カメラを開始'}
        </button>
        
        {isStreaming && (
          <div className={styles.slidersGroup}>
            <div className={styles.sliderContainer}>
              <label htmlFor="pixelSlider" className={styles.sliderLabel}>
                ピクセルサイズ: {pixelSize}
              </label>
              <input 
                id="pixelSlider"
                type="range" 
                min="2" 
                max="16" 
                step="1"
                value={pixelSize} 
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setPixelSize(newValue);
                  // 即時フィードバックのためのオプションのログ
                  console.log('ピクセルサイズ変更:', newValue);
                }}
                className={styles.slider}
              />
              <span className={styles.sliderValues}>
                <span>細かい</span>
                <span>粗い</span>
              </span>
            </div>
            
            <div className={styles.sliderContainer}>
              <label htmlFor="colorSlider" className={styles.sliderLabel}>
                色の深さ: {Math.pow(2, Math.round(8/colorDepth))}色
              </label>
              <input 
                id="colorSlider"
                type="range" 
                min="4" 
                max="64" 
                step="4"
                value={colorDepth} 
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setColorDepth(newValue);
                  // 即時フィードバックのためのオプションのログ
                  console.log('色深度変更:', newValue);
                }}
                className={styles.slider}
              />
              <span className={styles.sliderValues}>
                <span>多い</span>
                <span>少ない</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}