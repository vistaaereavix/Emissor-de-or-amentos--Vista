import React, { useRef, useState } from 'react';
import { CompanySettings } from '../types';
import { Building, Mail, Phone, MapPin, FileText, Upload, Trash, Eye, CheckCircle, RefreshCw, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

function formatCnpj(v: string) {
  const r = v.replace(/\D/g, '').slice(0, 14);
  if (r.length <= 2) return r;
  if (r.length <= 5) return `${r.slice(0, 2)}.${r.slice(2)}`;
  if (r.length <= 8) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5)}`;
  if (r.length <= 12) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8)}`;
  return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8, 12)}-${r.slice(12)}`;
}

function formatCep(v: string) {
  const r = v.replace(/\D/g, '').slice(0, 8);
  if (r.length <= 5) return r;
  return `${r.slice(0, 5)}-${r.slice(5)}`;
}

function formatTelefone(v: string) {
  const r = v.replace(/\D/g, '').slice(0, 11);
  if (r.length <= 2) return r;
  if (r.length <= 7) return `(${r.slice(0, 2)})${r.slice(2)}`;
  return `(${r.slice(0, 2)})${r.slice(2, 7)}-${r.slice(7)}`;
}

interface CompanySettingsFormProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  hasSynced?: boolean;
}

export default function CompanySettingsForm({ settings, onSave, onManualSync, isSyncing, hasSynced = false }: CompanySettingsFormProps) {
  const [formData, setFormData] = useState<CompanySettings>(() => {
    let base = { ...settings };
    const savedDraft = localStorage.getItem('draft_company_settings');
    if (savedDraft) {
      try {
        base = { ...base, ...JSON.parse(savedDraft) };
      } catch (_) {}
    }
    return {
      ...base,
      numero: base.numero || '',
      complemento: base.complemento || ''
    };
  });

  // Salva rascunho sempre que formData mudar
  React.useEffect(() => {
    localStorage.setItem('draft_company_settings', JSON.stringify(formData));
  }, [formData]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjSearchSuccess, setCnpjSearchSuccess] = useState(false);

  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCert(true);
    setCertError(null);

    try {
      const storageRef = ref(storage, `certificados/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const certInfo = {
        nomeArquivo: file.name,
        url: downloadURL,
        dataUpload: new Date().toISOString(),
      };
      
      const updated = {
        ...formData,
        certificadoDigital: certInfo
      };
      
      setFormData(updated);
      onSave(updated);
      alert('Certificado Digital carregado e salvo na nuvem com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload do certificado:', error);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const certInfo = {
            nomeArquivo: file.name,
            url: reader.result,
            dataUpload: new Date().toISOString(),
          };
          const updated = {
            ...formData,
            certificadoDigital: certInfo
          };
          setFormData(updated);
          onSave(updated);
          alert('Certificado carregado localmente com sucesso (modo offline)!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingCert(false);
    }
  };

  const handleRemoveCert = () => {
    const updated = {
      ...formData,
      certificadoDigital: undefined
    };
    setFormData(updated);
    onSave(updated);
    if (certInputRef.current) certInputRef.current.value = '';
    alert('Certificado Digital removido.');
  };

  const buscarCNPJProprio = async (cnpjValue: string) => {
    const cleaned = cnpjValue.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      setCnpjError('O CNPJ deve conter 14 dígitos.');
      return;
    }
    setLoadingCnpj(true);
    setCnpjError(null);
    setCnpjSearchSuccess(false);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
      if (!response.ok) {
        throw new Error('Erro');
      }
      const data = await response.json();

      const parts = [
        data.logradouro,
        data.bairro,
        data.municipio ? `${data.municipio}/${data.uf}` : '',
      ].filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        cnpj: formatCnpj(cnpjValue),
        razaoSocial: data.razao_social || prev.razaoSocial,
        nomeFantasia: data.nome_fantasia || data.razao_social || prev.nomeFantasia,
        cep: formatCep(data.cep || prev.cep),
        endereco: parts.join(' - ') || prev.endereco,
        numero: data.numero || '',
        complemento: data.complemento || '',
        email: data.email || prev.email,
        telefone: data.ddd && data.telefone ? formatTelefone(data.ddd + data.telefone) : prev.telefone,
      }));

      setCnpjSearchSuccess(true);
      setTimeout(() => setCnpjSearchSuccess(false), 2500);
    } catch (_) {
      setCnpjError('CNPJ não encontrado nas bases públicas ou erro de conexão.');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const buscarCEPPropria = async (cepCode: string) => {
    const cleaned = cepCode.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingCep(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }
      const data = await response.json();
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      const parts = [
        data.logradouro,
        data.bairro,
        data.localidade ? `${data.localidade}/${data.uf}` : '',
      ].filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        endereco: parts.join(' - ') || prev.endereco,
      }));
    } catch (err: any) {
      setCepError('CEP inválido ou erro de conexão.');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedVal = value;
    if (name === 'cep') {
      formattedVal = formatCep(value);
    } else if (name === 'cnpj') {
      formattedVal = formatCnpj(value);
    } else if (name === 'telefone') {
      formattedVal = formatTelefone(value);
    }
    setFormData((prev) => ({ ...prev, [name]: formattedVal }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter menos de 2MB para caber no armazenamento local.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, logo: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerDynamicLogo = () => {
    // Desenha um logo profissional de drone num canvas local e atribui à empresa!
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background circular
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.beginPath();
      ctx.arc(100, 100, 100, 0, 2 * Math.PI);
      ctx.fill();

      // Anel decorativo Sky Blue
      ctx.strokeStyle = '#0ea5e9'; // Sky-500
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(100, 100, 85, 0, 2 * Math.PI);
      ctx.stroke();

      // Desenha o Símbolo de um Drone minimalista
      ctx.fillStyle = '#0ea5e9'; // Hélices e corpo
      // Corpo Central
      ctx.beginPath();
      ctx.arc(100, 100, 18, 0, 2 * Math.PI);
      ctx.fill();

      // Engrenagem ou miolo central
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(100, 100, 12, 0,  2 * Math.PI);
      ctx.stroke();

      // Braços do drone (X shape)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      
      // Top Left to Bottom Right
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(150, 150);
      ctx.stroke();

      // Top Right to Bottom Left
      ctx.beginPath();
      ctx.moveTo(150, 50);
      ctx.lineTo(50, 150);
      ctx.stroke();

      // Motores nas pontas (Círculos azuis escuros/brancos)
      ctx.fillStyle = '#0ea5e9';
      const points = [{x: 50, y: 50}, {x: 150, y: 50}, {x: 50, y: 150}, {x: 150, y: 150}];
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Texto "VISTA AÉREA" curvado ou inferior
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Helvetica, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VISTA AÉREA', 100, 182);

      const dataUrl = canvas.toDataURL('image/png');
      setFormData(prev => ({ ...prev, logo: dataUrl }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6" id="company-settings-tab">
      <div className="flex items-center space-x-3 mb-5">
        <div className="bg-sky-50 p-2.5 rounded-xl text-sky-500">
          <Building size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Minha Empresa</h2>
          <p className="text-xs text-slate-500">Dados do emitente que aparecerão no orçamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bloco de Carregamento de Logotipo */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Logo da Empresa (PDF)
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden relative shadow-sm">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400 font-medium">Sem Logo</span>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition active:scale-95"
                >
                  <Upload size={14} />
                  <span>Fazer Upload</span>
                </button>

                {formData.logo ? (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash size={14} />
                    <span>Remover</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={triggerDynamicLogo}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 text-xs font-semibold text-sky-600 rounded-lg hover:bg-sky-100 transition"
                  >
                    <span>Gerar Logo Oficial (Drones)</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Formatos suportados: PNG, JPG ou SVG. Tamanho máx. 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* Bloco de Carregamento de Certificado Digital */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col space-y-3">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Certificado Digital (Assinatura Eletrônica)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2.5 rounded-lg ${formData.certificadoDigital ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">
                  {formData.certificadoDigital ? formData.certificadoDigital.nomeArquivo : 'Nenhum certificado adicionado'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {formData.certificadoDigital 
                    ? `Enviado em ${new Date(formData.certificadoDigital.dataUpload).toLocaleDateString('pt-BR')}`
                    : 'Suas propostas eletrônicas serão chanceladas'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <input
                type="file"
                onChange={handleCertUpload}
                ref={certInputRef}
                className="hidden"
                id="digital-cert-input"
              />
              <button
                type="button"
                disabled={isUploadingCert}
                onClick={() => certInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 text-xs font-bold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Upload size={13} />
                <span>{isUploadingCert ? 'Adicionando...' : 'Adicionar Certificado Digital'}</span>
              </button>

              {formData.certificadoDigital && (
                <button
                  type="button"
                  onClick={handleRemoveCert}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition cursor-pointer"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Building size={16} />
              </span>
              <input
                type="text"
                name="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={handleChange}
                required
                autoCorrect="on"
                spellCheck={true}
                placeholder=""
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FileText size={16} />
              </span>
              <input
                type="text"
                name="razaoSocial"
                value={formData.razaoSocial}
                onChange={handleChange}
                required
                autoCorrect="on"
                spellCheck={true}
                placeholder=""
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">CNPJ *</label>
                {formData.cnpj.replace(/\D/g, '').length === 14 && (
                  <button
                    type="button"
                    onClick={() => buscarCNPJProprio(formData.cnpj)}
                    disabled={loadingCnpj}
                    className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800 flex items-center space-x-1 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 transition"
                  >
                    {loadingCnpj ? (
                      <RefreshCw size={10} className="animate-spin" />
                    ) : cnpjSearchSuccess ? (
                      <Check size={10} className="text-emerald-600" />
                    ) : (
                      <span>Carregar dados</span>
                    )}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    handleChange(e);
                    if (cleaned.length === 14) {
                      buscarCNPJProprio(cleaned);
                    }
                  }}
                  required
                  autoCorrect="on"
                  spellCheck={true}
                  placeholder=""
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all pr-10"
                />
                {loadingCnpj && (
                  <span className="absolute right-3.5 top-2.5 text-sky-500 animate-spin">
                    <RefreshCw size={14} />
                  </span>
                )}
                {cnpjSearchSuccess && (
                  <span className="absolute right-3.5 top-2.5 text-emerald-500">
                    <Check size={14} />
                  </span>
                )}
              </div>
              {cnpjError && (
                <p className="text-[10px] font-medium text-red-500 mt-1">{cnpjError}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CEP *</label>
              <div className="relative">
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    handleChange(e);
                    const cleaned = e.target.value.replace(/\D/g, '');
                    if (cleaned.length === 8) {
                      buscarCEPPropria(cleaned);
                    }
                  }}
                  required
                  autoCorrect="on"
                  spellCheck={true}
                  placeholder=""
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all pr-10"
                />
                {loadingCep && (
                  <span className="absolute right-3.5 top-2.5 text-sky-500 animate-spin">
                    <RefreshCw size={14} />
                  </span>
                )}
              </div>
              {cepError && (
                <p className="text-[10px] font-medium text-red-500 mt-1">{cepError}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço (Sem o número) *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <MapPin size={16} />
              </span>
              <input
                type="text"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                required
                autoCorrect="on"
                spellCheck={true}
                placeholder="Rua, avenida, travessa, etc."
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Número *</label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                required
                autoCorrect="on"
                spellCheck={true}
                placeholder="Ex: 50"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Complemento</label>
              <input
                type="text"
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                autoCorrect="on"
                spellCheck={true}
                placeholder="Ex: Sala 42, Bloco B"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Corporativo *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoCorrect="on"
                  spellCheck={true}
                  placeholder=""
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / WhatsApp *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  required
                  autoCorrect="on"
                  spellCheck={true}
                  placeholder=""
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-sky-600 bg-sky-50 border border-sky-100 p-3 rounded-xl text-xs font-semibold justify-center"
          >
            <CheckCircle size={16} />
            <span>Configurações salvas com sucesso!</span>
          </motion.div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-98 cursor-pointer flex justify-center items-center space-x-2"
        >
          <span>Salvar Configurações</span>
        </button>

        {onManualSync && (
          <div className="pt-4 border-t border-slate-150 flex flex-col items-center space-y-2 mt-4">
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className={`w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-2 shadow-sm ${
                isSyncing ? 'animate-pulse opacity-60' : ''
              }`}
              title="Sincronizar dados com o Firebase"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-400' : 'text-sky-600'} />
              <span>Sincronização</span>
            </button>
            <div className="text-[11px] font-semibold text-center pt-1">
              {!hasSynced ? (
                <span className="text-amber-600">Aguardando clique no botão Sincronização</span>
              ) : (
                <span className="text-emerald-600 flex items-center justify-center gap-1">
                  <Check size={14} /> Sincronizado com sucesso!
                </span>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
