import numpy as np, sys, os
from PIL import Image
W,H,FPS,SEC=960,540,24,16; N=FPS*SEC
rng=np.random.default_rng(11)
# periodic fractal noise texture (FFT), warm nebula density
T=1024
def fnoise(beta,seed):
    r=np.random.default_rng(seed); f=np.fft.fftfreq(T)
    k=np.sqrt(f[:,None]**2+f[None,:]**2); k[0,0]=1
    sp=(r.normal(size=(T,T))+1j*r.normal(size=(T,T)))/k**beta; sp[0,0]=0
    n=np.real(np.fft.ifft2(sp)); n=(n-n.mean())/n.std(); return n
d1=fnoise(1.6,1); d2=fnoise(1.9,2)
neb=np.clip(.5+.35*d1,0,1)**3; tint=np.clip(.5+.3*d2,0,1)
def sample(tex,u,v):
    u%=T; v%=T; x0=np.floor(u).astype(int); y0=np.floor(v).astype(int); fx=u-x0; fy=v-y0
    x1=(x0+1)%T; y1=(y0+1)%T
    return (tex[y0,x0]*(1-fx)*(1-fy)+tex[y0,x1]*fx*(1-fy)+tex[y1,x0]*(1-fx)*fy+tex[y1,x1]*fx*fy)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32); cx,cy=W/2,H/2
dx,dy=xx-cx,yy-cy
# galaxy band: soft diagonal, screen-space
ang=np.deg2rad(-18); dist=(-np.sin(ang)*dx+np.cos(ang)*dy)
band=np.exp(-(dist/150)**2)*.85+.15
band*=np.exp(-((np.cos(ang)*dx+np.sin(ang)*dy)/700)**2)*.6+.4
vign=1-.35*((dx/cx)**2+(dy/cy)**2)
# stars in 3D, depth periodic over loop
K=2600; X=rng.uniform(-1.6,1.6,K); Y=rng.uniform(-1,1,K); z0=rng.random(K)
mag=rng.random(K)**3; warm=rng.random(K)
col=np.stack([np.ones(K),.93-.10*warm,.82-.28*warm],1)  # warm white -> soft gold
tw=rng.integers(1,4,K); ph=rng.uniform(0,2*np.pi,K)
OCT=5
def box(a,r):
    for ax in (0,1):
        c=np.cumsum(np.pad(a,[(r+1,r) if i==ax else (0,0) for i in range(a.ndim)],mode='constant'),axis=ax)
        a=(np.take(c,range(2*r+1,c.shape[ax]),axis=ax)-np.take(c,range(0,c.shape[ax]-2*r-1),axis=ax))/(2*r+1)
    return a
os.makedirs('fr',exist_ok=True)
for i in range(N):
    p=i/N
    # infinite zoom: octave-blended, exactly periodic in p
    acc=np.zeros((H,W),np.float32); tacc=np.zeros((H,W),np.float32); ws=0
    for k in range(OCT):
        s=2**(k+p-1); w=np.sin(np.pi*(k+p)/OCT)**2
        u=T/2+dx/s*.9; v=T/2+dy/s*.9
        acc+=w*sample(neb,u,v); tacc+=w*sample(tint,u,v); ws+=w
    acc/=ws; tacc/=ws
    dens=(acc*band*vign).astype(np.float32)
    img=np.zeros((H,W,3),np.float32)
    rose=np.array([.55,.30,.28]); amber=np.array([.60,.42,.22])
    c=tacc[...,None]*amber+(1-tacc[...,None])*rose
    img+=dens[...,None]*c*1.0
    # core glow
    img+=(np.exp(-((dx/260)**2+(dy/160)**2))*.06)[...,None]*np.array([1,.85,.65])
    # stars
    z=(z0-p)%1.0; z=.06+.94*z
    sx=cx+X/z*cx*.35; sy=cy+Y/z*cx*.35
    fade=np.clip((1-z)/.25,0,1)*np.clip((z-.06)/.12,0,1)
    b=(.25+.75*mag)*fade*(.75+.25*np.sin(2*np.pi*tw*p+ph))*(1.2/(z+.2))*.55
    ok=(sx>=0)&(sx<W-1)&(sy>=0)&(sy<H-1)&(b>.003)
    x0=np.floor(sx[ok]).astype(int); y0=np.floor(sy[ok]).astype(int); fx=sx[ok]-x0; fy=sy[ok]-y0
    st=np.zeros((H,W,3),np.float32); bb=b[ok][:,None]*col[ok]
    for ox,oy,wt in ((0,0,(1-fx)*(1-fy)),(1,0,fx*(1-fy)),(0,1,(1-fx)*fy),(1,1,fx*fy)):
        np.add.at(st,(y0+oy,x0+ox),bb*wt[:,None])
    glow=box(box(st,2),2)
    img+=st+glow*1.6
    img=1-np.exp(-img*1.4)  # soft tonemap
    Image.fromarray((np.clip(img,0,1)**(1/1.1)*255).astype(np.uint8)).save(f'fr/{i:04d}.png')
    if i%48==0: print(i,flush=True)
