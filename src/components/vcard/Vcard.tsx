import { useEffect, useState } from "react";
import type { Contact } from "../../types";

interface VCardProps {
    vcard: string;
    contact: Contact;
    picture?: string;
}

const defaultVCard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//iPhone OS 18.2//EN
N:Carnaroli;Chase;;;
FN:Chase Carnaroli
ORG:Tech Inc;
TITLE:Software Engineer
EMAIL;type=INTERNET;type=HOME;type=pref:chase@email.com
EMAIL;type=INTERNET;type=WORK:chase@work.com
TEL;type=CELL;type=VOICE;type=pref:(555) 555-5555
TEL;type=HOME;type=VOICE:(555) 222-2222
ADR;type=HOME;type=pref:;;1 Dr Carlton B Goodlett Pl;San Francisco;CA;94102;
X-SOCIALPROFILE;type=linkedin;x-userid=ChaseCarnaroli:https://www.linkedin.com/in/ChaseCarnaroli
X-SOCIALPROFILE;type=twitter;x-userid=ChaseCarnaroli:https://twitter.com/ChaseCarnaroli
URL;type=pref;type=_$!<HomePage>!$_:chasecarnaroli.com
URL;type=QR Me:qrme.contact
BDAY:2025-04-15
NOTE:I love building great products. \\nLooking forward to connecting with you!
END:VCARD`;

export default function VCard({ vcard = defaultVCard, contact, picture }: VCardProps) {
    
    // Fetch the image's base64 and add it to the vCard
    const fetchImage = async () => {
        const imageUrl = "https://chasecarnaroli.com/img/profile_pic.jpg";
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;

            if (!base64data) {
                console.error("Failed to load image");
                return;
            }
            if (typeof base64data !== "string") {
                console.error("Base64 data is not a string");
                return;
            }

            // Split the string on the first comma,
            // and take the second part (the actual base64 data)
            const base64String = base64data.split(',')[1];
            const photo = "PHOTO;TYPE=JPEG;ENCODING=b:" + base64String;

            // Replace the last line in the vCard with the photo line
            const updatedVCard = vcard.replace(/END:VCARD/, `${photo}\nEND:VCARD`);

            // setVcard(updatedVCard);
        };
    };

    

    const downloadVCard = () => {
        console.log("Downloading vCard...");
        const blob = new Blob([vcard], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contact.vcf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // const contact = parseVCard(vcard);

    return (
        <div>
            <h1>vCard</h1>
            <h2>{contact.name}</h2>
            <p>{contact.title}</p>
            <p>{contact.org}</p>
            <p>{contact.birthday}</p>
            <p>{contact.note}</p>
            <h3>Contact Details</h3>
            <ul>
                {contact.emails?.map((email, index) => (
                    <li key={index}>{email.value}</li>
                ))}
                {contact.phones?.map((phone, index) => (
                    <li key={index}>{phone.value}</li>
                ))}
                {contact.postalAddresses?.map((address, index) => (
                    <li key={index}>{address.value}</li>
                ))}
                {contact.urls?.map((url, index) => (
                    <li key={index}>{url.value}</li>
                ))}
                {contact.socialProfiles?.map((profile, index) => (
                    <li key={index}>{profile.type}: {profile.url}</li>
                ))}
            </ul>

            {/* <textarea
                value={vcard}
                onChange={(e) => setVcard(e.target.value)}
                rows={10}
                style={{ width: "100%", marginBottom: "1rem", whiteSpace: "pre-wrap" }}
            /> */}
            <h3>Download vCard</h3>
            <button id="download-vcard" onClick={downloadVCard}>
                Download vCard
            </button>
        </div>
    )
}
// ---
// const vcard = `BEGIN:VCARD

// `;
// ---
// <body>
//     <div>
//         <div class="contact-card">
//             <div class="profile-section">
//                 <div class="profile-image">
//                     <img src="images/profile-placeholder.png" alt="Profile Picture">
//                 </div>
//                 <h1 class="profile-name">John Doe</h1>
//                 <p class="profile-title">Software Engineer</p>
//                 <p class="profile-company">Example Company</p>
//             </div>
            
//             <div class="contact-details">
//                 <div class="contact-item">
//                     <span class="contact-icon">📞</span>
//                     <span class="contact-info">(123) 456-7890</span>
//                 </div>
                
//                 <div class="contact-item">
//                     <span class="contact-icon">✉️</span>
//                     <span class="contact-info">john.doe@example.com</span>
//                 </div>
                
//                 <div class="contact-item">
//                     <span class="contact-icon">🌐</span>
//                     <span class="contact-info"><a href="https://example.com">example.com</a></span>
//                 </div>
                
//                 <div class="contact-item">
//                     <span class="contact-icon">📍</span>
//                     <span class="contact-info">123 Main Street, City, Country</span>
//                 </div>
//             </div>
            
//             <div class="social-links">
//                 <a href="#" class="social-link">LinkedIn</a>
//                 <a href="#" class="social-link">Twitter</a>
//                 <a href="#" class="social-link">GitHub</a>
//             </div>
//         </div>
//     </div>
//     <div class="download-container">
//         <button id="download-vcard" class="download-button">Download vCard</button>
//     </div>

//     <script type="text/javascript">
//         document.getElementById('download-vcard').addEventListener('click', function () {
//             const vCardData = `BEGIN:VCARD
//     VERSION:3.0
//     FN:John Doe
//     ORG:Example Company
//     TITLE:Software Engineer
//     TEL;TYPE=WORK,VOICE:(123) 456-7890
//     EMAIL:john.doe@example.com
//     END:VCARD`;

//             const blob = new Blob([vCardData], { type: 'text/vcard' });
//             const url = URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = 'contact.vcf';
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             URL.revokeObjectURL(url);
//         });
//     </script>
// </body>
