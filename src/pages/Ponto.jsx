import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Ponto.css'; // Estilos separados em um CSS

const Ponto = ({ pontos }) => {
    const [data, setData] = useState(pontos);

    useEffect(() => {
        setData(pontos);
    }, [pontos]); // Atualiza o estado quando os pontos mudam

    const handleDelete = (id) => {
        // lógica para deletar um ponto
    };

    return (
        <div className="ponto-container">
            <table className="ponto-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((ponto) => (
                        <tr key={ponto.id}>
                            <td>{ponto.data}</td>
                            <td>{ponto.hora}</td>
                            <td>
                                <button className='btn ação' onClick={() => handleEdit(ponto.id)}>Editar</button>
                                <button className='btn ação' onClick={() => handleDelete(ponto.id)}>Excluir</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

Ponto.propTypes = {
    pontos: PropTypes.array.isRequired,
};

export default Ponto;