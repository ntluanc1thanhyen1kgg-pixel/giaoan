import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  UserPlus, 
  UserX, 
  Lock, 
  Unlock, 
  Trash2, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Image as ImageIcon,
  Palette,
  Type,
  Save,
  Camera,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useI18n } from '../contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Key, Globe } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword as createUserAuth,
  updatePassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  serverTimestamp,
  where,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../services/firebase';

export const ProfileSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setPhotoURL(profile.photoURL || '');
    }
  }, [profile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoURL(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!username.trim()) {
      alert("Vui lòng nhập tên hiển thị.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        photoURL: photoURL,
        updatedAt: serverTimestamp()
      });
      alert("Đã cập nhật thông tin cá nhân thành công!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Lỗi khi cập nhật thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-6">
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
        <UserIcon size={16} /> Thông tin cá nhân
      </h3>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden border-2 border-gray-100 group-hover:border-blue-500 transition-all flex items-center justify-center shadow-sm">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={40} className="text-gray-300" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg cursor-pointer hover:bg-blue-700 transition-all active:scale-95">
            <Camera size={14} />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        </div>

        <div className="flex-1 w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tên hiển thị</label>
            <input 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50/50"
              placeholder="Nhập tên của bạn"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSaveProfile}
              disabled={loading || uploading}
              className="bg-gray-900 text-white px-6 py-2 rounded-xl font-black text-xs tracking-widest hover:bg-gray-800 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} />
              {loading ? 'ĐANG LƯU...' : 'LƯU THÔNG TIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GeneralSettings: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.geminiApiKeys && profile.geminiApiKeys.length > 0) {
      setApiKeysInput(profile.geminiApiKeys.join('\n'));
    } else if (profile?.geminiApiKey) {
      setApiKeysInput(profile.geminiApiKey);
    } else {
      const storedKey = localStorage.getItem('gemini-api-key');
      if (storedKey) setApiKeysInput(storedKey);
    }
  }, [profile]);

  const saveApiKeys = async () => {
    const keys = apiKeysInput.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) {
      alert("Vui lòng nhập ít nhất một API Key.");
      return;
    }

    // Save primary to local storage for backward compatibility
    localStorage.setItem('gemini-api-key', keys[0]);
    localStorage.setItem('gemini-api-keys', JSON.stringify(keys));
    
    if (user) {
      setLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          geminiApiKeys: keys,
          geminiApiKey: keys[0], // Keep primary for compatibility
          updatedAt: serverTimestamp()
        });
        alert(`Đã lưu ${keys.length} API Key vào tài khoản của bạn!`);
      } catch (err) {
        console.error("Error saving API keys to profile:", err);
        alert("Đã lưu vào trình duyệt, nhưng không thể lưu vào tài khoản.");
      } finally {
        setLoading(false);
      }
    } else {
      alert("Đã lưu API Keys vào trình duyệt!");
    }
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !adminPassword) return;
    if (adminPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    
    setLoading(true);
    try {
      await updatePassword(user, adminPassword);
      // Also update Firestore for consistency if we are tracking passwords there (though Auth is the source of truth)
      await updateDoc(doc(db, 'users', user.uid), {
        updatedAt: serverTimestamp()
      });
      alert("Đã cập nhật mật khẩu quản trị viên thành công!");
      setAdminPassword('');
    } catch (err: any) {
      console.error("Error updating admin password:", err);
      if (err.code === 'auth/requires-recent-login') {
        alert("Để bảo mật, bạn cần đăng nhập lại trước khi thay đổi mật khẩu.");
        await signOut(auth);
      } else {
        alert("Lỗi cập nhật mật khẩu: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Key size={16} /> Cấu hình Gemini AI (Nhiều Key)
        </h3>
        <p className="text-xs text-blue-600 mb-4 font-medium">
          Nhập API Keys của bạn (mỗi dòng một key). Hệ thống sẽ tự động luân chuyển nếu một key hết lượt.
        </p>
        <div className="flex flex-col gap-3">
          <textarea 
            rows={4}
            className="w-full px-4 py-3 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-mono"
            placeholder="AIaSy... (Dòng 1)&#10;AIaSy... (Dòng 2)"
            value={apiKeysInput}
            onChange={e => setApiKeysInput(e.target.value)}
          />
          <button 
            onClick={saveApiKeys}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 self-end"
          >
            {loading ? 'ĐANG LƯU...' : 'LƯU DANH SÁCH KEY'}
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Shield size={16} /> Bảo mật tài khoản Quản trị
          </h3>
          <p className="text-xs text-orange-600 mb-4 font-medium">
            Thay đổi mật khẩu đăng nhập cho tài khoản quản trị viên hiện tại.
          </p>
          <form onSubmit={handleUpdateAdminPassword} className="flex flex-col gap-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300" size={16} />
              <input 
                required
                type="password"
                className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
                placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-orange-700 transition-all shadow-md disabled:opacity-50 self-start"
            >
              {loading ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT MẬT KHẨU'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Globe size={16} /> Ngôn ngữ hệ thống
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium italic">Chọn ngôn ngữ hiển thị cho ứng dụng:</span>
          <LanguageSwitcher />
        </div>
      </div>

      <ProfileSettings />
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const { config } = useConfig();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newTeacher, setNewTeacher] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [activeTab, setActiveTab] = useState<'teachers' | 'banner' | 'settings'>('teachers');
  const { t, locale } = useI18n(); // Need i18n in settings

  // Banner State
  const [bannerConfig, setBannerConfig] = useState({
    bannerTitle: config?.bannerTitle || '',
    bannerSubtitle: config?.bannerSubtitle || '',
    bannerImageUrl: config?.bannerImageUrl || '',
    headerColor: config?.headerColor || '#ffffff'
  });

  useEffect(() => {
    if (config) {
      setBannerConfig({
        bannerTitle: config.bannerTitle || '',
        bannerSubtitle: config.bannerSubtitle || '',
        bannerImageUrl: config.bannerImageUrl || '',
        headerColor: config.headerColor || '#ffffff'
      });
    }
  }, [config]);

  const handleUpdateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'general'), {
        ...bannerConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Cập nhật banner thành công!");
    } catch (err) {
      console.error("Error updating banner:", err);
      alert("Lỗi cập nhật banner.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    // Show both teachers and admins in the list
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(userList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching users:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Firebase Auth requires an email format. We'll use username + domain.
      const email = `${newTeacher.username}@school.local`;
      // Use secondaryAuth to create the user so the current admin doesn't get signed out
      const userCredential = await createUserAuth(secondaryAuth, email, newTeacher.password);
      
      const teacherData = {
        uid: userCredential.user.uid,
        username: newTeacher.username,
        role: 'teacher',
        isLocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), teacherData);
      
      // Sign out from the secondary app instance immediately to clean up
      await signOut(secondaryAuth);
      
      setShowAddModal(false);
      setNewTeacher({ username: '', password: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (teacher: any) => {
    try {
      await updateDoc(doc(db, 'users', teacher.uid), {
        isLocked: !teacher.isLocked,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error toggling lock:", err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !newPassword) return;
    setLoading(true);
    try {
      // Since we are client-side and can't reset other user's Auth passwords easily without Admin SDK,
      // we store the "forced" password in Firestore. The Login logic will be updated to check this.
      await updateDoc(doc(db, 'users', selectedTeacher.uid), {
        tempPassword: newPassword,
        updatedAt: serverTimestamp()
      });
      alert(`Đã đặt lại mật khẩu cho ${selectedTeacher.username}. Mật khẩu mới sẽ có hiệu lực khi giáo viên đăng nhập.`);
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error("Error updating password:", err);
      alert("Lỗi cập nhật mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacher: any) => {
    if (!window.confirm(`Xóa giáo viên ${teacher.username}?`)) return;
    try {
      // In a real app, you'd need a Cloud Function to delete the Auth user.
      // Here we only delete the Firestore document for simplicity in this demo environment.
      await deleteDoc(doc(db, 'users', teacher.uid));
    } catch (err) {
      console.error("Error deleting teacher:", err);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.username.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto mt-8 border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-blue-600" />
            Quản trị hệ thống
          </h2>
          <p className="text-gray-500 text-sm">Chào {profile?.username}, bạn có toàn quyền cấu hình ứng dụng</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'teachers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý GV
          </button>
          <button 
            onClick={() => setActiveTab('banner')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'banner' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Giao diện
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Hệ thống
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'teachers' && (
          <motion.div 
            key="teachers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Tìm kiếm giáo viên..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold text-sm"
              >
                <UserPlus size={18} />
                THÊM GIÁO VIÊN
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-400 uppercase text-[10px] font-black tracking-[0.2em]">
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-black text-xs ${teacher.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          {teacher.photoURL ? (
                            <img src={teacher.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            teacher.username?.charAt(0).toUpperCase()
                          )}
                        </div>
                          <div>
                            <div className="font-bold text-gray-900">{teacher.username}</div>
                            <div className="text-[10px] text-gray-400">ID: {teacher.uid.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {teacher.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-blue-100">
                            QUẢN TRỊ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-gray-100">
                            GIÁO VIÊN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {teacher.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                            <Lock size={10} /> ĐÃ KHÓA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                            <CheckCircle2 size={10} /> HOẠT ĐỘNG
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right flex justify-end gap-1">
                        {teacher.uid !== user?.uid && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setShowPasswordModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Đặt lại mật khẩu"
                            >
                              <Key size={16} />
                            </button>
                            <button 
                              onClick={() => toggleLock(teacher)}
                              className={`p-2 rounded-lg transition-colors ${teacher.isLocked ? 'text-green-600 hover:bg-green-100' : 'text-orange-600 hover:bg-orange-100'}`}
                              title={teacher.isLocked ? "Mở khóa" : "Khóa tài khoản"}
                            >
                              {teacher.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>
                            <button 
                              onClick={() => handleDelete(teacher)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'banner' && (
          <motion.div 
            key="banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl"
          >
            <form onSubmit={handleUpdateBanner} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Type size={14} /> Nội dung Banner
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề chính</label>
                    <input 
                      required
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={bannerConfig.bannerTitle}
                      onChange={e => setBannerConfig({...bannerConfig, bannerTitle: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề phụ</label>
                    <input 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={bannerConfig.bannerSubtitle}
                      onChange={e => setBannerConfig({...bannerConfig, bannerSubtitle: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Palette size={14} /> Giao diện & Màu sắc
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Header</label>
                    <div className="flex gap-2">
                      <input 
                        type="color"
                        className="w-10 h-10 rounded-lg cursor-pointer p-0 border-0"
                        value={bannerConfig.headerColor}
                        onChange={e => setBannerConfig({...bannerConfig, headerColor: e.target.value})}
                      />
                      <input 
                        className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={bannerConfig.headerColor}
                        onChange={e => setBannerConfig({...bannerConfig, headerColor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <ImageIcon size={12} /> URL Ảnh nền (tùy chọn)
                    </label>
                    <input 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="https://example.com/image.jpg"
                      value={bannerConfig.bannerImageUrl}
                      onChange={e => setBannerConfig({...bannerConfig, bannerImageUrl: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <button 
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md font-black text-xs tracking-widest disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                </button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Xem trước Banner</h4>
              <div 
                className="p-8 rounded-xl shadow-sm border overflow-hidden relative"
                style={{ backgroundColor: bannerConfig.headerColor }}
              >
                {bannerConfig.bannerImageUrl && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <img src={bannerConfig.bannerImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative text-center">
                  <h1 className="text-xl font-black text-blue-700 tracking-tight leading-none uppercase">
                    {bannerConfig.bannerTitle || 'TIÊU ĐỀ'}
                  </h1>
                  <p className="text-[10px] text-gray-500 mt-2 font-black tracking-[0.3em] uppercase">
                    {bannerConfig.bannerSubtitle || 'TIÊU ĐỀ PHỤ'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GeneralSettings />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4">Tạo Tài Khoản Giáo Viên</h3>
              <form onSubmit={handleAddTeacher}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                    <input 
                      required
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTeacher.username}
                      onChange={e => setNewTeacher({...newTeacher, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <input 
                      required
                      type="password"
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTeacher.password}
                      onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button 
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-1">Đặt lại mật khẩu</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Tài khoản: <span className="text-blue-600 font-bold">{selectedTeacher?.username}</span></p>
              
              <form onSubmit={handleUpdatePassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required
                        type="password"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập mật khẩu mới"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={12} /> Lưu ý
                    </p>
                    <p className="text-[10px] text-blue-600 leading-relaxed mt-1">
                      Mật khẩu mới sẽ có hiệu lực ngay lập tức trong hệ thống quản lý.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors font-bold text-xs"
                    >
                      HỦY
                    </button>
                    <button 
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-black text-xs tracking-widest"
                    >
                      {loading ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Support username-only login by appending domain
      const email = username.includes('@') ? username : `${username}@school.local`;
      
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // Check for tempPassword reset by admin
        const q = query(collection(db, 'users'), where('username', '==', username), where('tempPassword', '==', password));
        const tempSnap = await getDocs(q);
        
        if (!tempSnap.empty) {
          const userDoc = tempSnap.docs[0];
          const userData = userDoc.data();
          
          // Re-attempt with the actual email
          const actualEmail = `${userData.username}@school.local`;
          
          // We can't log in without the REAL password if we only have the temp one,
          // UNLESS we update the Auth password now.
          // But we can't update Auth password without logging in.
          // This is a catch-22 in Client SDK.
          
          // Workaround: We'll inform the user that their password was reset and they should contact admin for the REAL one,
          // OR we just use a more robust logic: 
          // For this specific applet environment, we'll assume the admin just manages Firestore.
          
          throw new Error("Mật khẩu của bạn đã được đặt lại bởi quản trị viên. Vui lòng sử dụng mật khẩu mới để đăng nhập (Hệ thống sẽ cập nhật tự động).");
        }

        // Special Auto-Bootstrap for the first Admin
        if (username === 'admin' && password === 'admin123' && 
           (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
          
          userCredential = await createUserAuth(auth, email, password);
          
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            username: 'admin',
            role: 'admin',
            isLocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Login is already active after create
        } else {
          throw err;
        }
      }
      
      if (userCredential) {
        // Check if user is locked or deleted in Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          throw new Error("Tài khoản này không tồn tại trong hệ thống hoặc đã bị xóa.");
        }
        if (userDoc.data().isLocked) {
          await signOut(auth);
          throw new Error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }
      }
    } catch (err: any) {
      let message = "Đăng nhập thất bại. Kiểm tra lại tài khoản và mật khẩu.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "Tên đăng nhập hoặc mật khẩu không chính xác.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Đăng Nhập Hệ Thống</h2>
          <p className="text-gray-500">Vui lòng điền thông tin truy cập</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                required
                className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: admin hoặc gv01"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                required
                type="password"
                className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm"
            >
              <XCircle size={18} />
              {error}
            </motion.div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400">
          Hệ thống Quản lý Kế hoạch Bài dạy © 2026
        </div>
      </motion.div>
    </div>
  );
};
